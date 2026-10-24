// ======================================================================
// ГЕНЕРАТОР БИНАРНОГО ФАЙЛА SPSS (.SAV) В БРАУЗЕРЕ (UTF-8)
// ======================================================================

const spssEncoder = new TextEncoder();

// Безопасная обрезка UTF-8 строки по лимиту байт (чтобы не разрезать кириллический символ пополам)
function encodeUtf8Safe(str, maxBytes) {
    const full = spssEncoder.encode(String(str || ''));
    if (full.length <= maxBytes) return full;
    let len = maxBytes;
    while (len > 0 && (full[len] & 0b11000000) === 0b10000000) {
        len--;
    }
    return full.slice(0, len);
}

// Динамический буфер для последовательной сборки бинарного файла .sav (Little-Endian)
class SavBufferWriter {
    constructor(initialCapacity = 262144) {
        this.buffer = new ArrayBuffer(initialCapacity);
        this.view = new DataView(this.buffer);
        this.bytes = new Uint8Array(this.buffer);
        this.offset = 0;
    }

    ensure(extra) {
        if (this.offset + extra <= this.buffer.byteLength) return;
        let newCap = this.buffer.byteLength * 2;
        while (newCap < this.offset + extra) newCap *= 2;
        const newBuf = new ArrayBuffer(newCap);
        new Uint8Array(newBuf).set(this.bytes.subarray(0, this.offset));
        this.buffer = newBuf;
        this.view = new DataView(this.buffer);
        this.bytes = new Uint8Array(this.buffer);
    }

    writeInt32(val) {
        this.ensure(4);
        this.view.setInt32(this.offset, val, true);
        this.offset += 4;
    }

    writeFloat64(val) {
        this.ensure(8);
        this.view.setFloat64(this.offset, val, true);
        this.offset += 8;
    }

    writeUint8(val) {
        this.ensure(1);
        this.view.setUint8(this.offset, val);
        this.offset += 1;
    }

    writeBytes(uint8Arr) {
        this.ensure(uint8Arr.length);
        this.bytes.set(uint8Arr, this.offset);
        this.offset += uint8Arr.length;
    }

    writeFixedString(str, byteLength, padByte = 0x20) {
        this.ensure(byteLength);
        const encoded = encodeUtf8Safe(str, byteLength);
        this.bytes.fill(padByte, this.offset, this.offset + byteLength);
        this.bytes.set(encoded, this.offset);
        this.offset += byteLength;
    }

    toUint8Array() {
        return this.bytes.subarray(0, this.offset);
    }
}

// Очистка имени переменной под стандарт SPSS (без дефисов и пробелов)
function sanitizeSpssVarName(name) {
    let clean = String(name).replace(/[^A-Za-z0-9_]/g, '_');
    if (/^[0-9]/.test(clean)) clean = 'V_' + clean;
    return clean.slice(0, 64);
}

// Форматирование текущей даты и времени для заголовка .sav
function getSpssDateTime() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mon = months[now.getMonth()];
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return {
        dateStr: `${dd} ${mon} ${yy}`,
        timeStr: `${hh}:${mm}:${ss}`
    };
}

// Основная функция упаковки данных и словаря в бинарный формат .sav
function generateSavBinary(codedRows, orderedCols, fullMeta) {
    const SYSMIS = -Number.MAX_VALUE;
    const HIGHEST = Number.MAX_VALUE;
    const writer = new SavBufferWriter(524288);

    // 1. Подготовка описаний переменных и расчет 8-байтовых слотов
    let currentSlot = 1;
    const varDefs = [];

    orderedCols.forEach((colKey, idx) => {
        const meta = fullMeta[colKey] || { label: colKey, type: 'numeric', measure: 'scale' };
        const isString = meta.type === 'string';
        const isShortStr = (colKey === 'Timestamp' || colKey === 'Total_Time' || colKey === 'Fast_Clicker');
        const strByteWidth = isString ? (isShortStr ? 32 : 240) : 0;
        const slotsCount = isString ? (strByteWidth / 8) : 1;

        const shortName = `V${idx + 1}`;
        const longName = sanitizeSpssVarName(colKey);

        let measureCode = 3; // 3 = Scale
        if (meta.measure === 'nominal' || isString) measureCode = 1;
        else if (meta.measure === 'ordinal') measureCode = 2;

        // Умная обрезка подписи переменной до 128 символов и меток значений до 60 символов (как в process_survey (2).py)
        const trimmedVarLabel = typeof metaTrim === 'function' ? metaTrim(meta.label || colKey, LABEL_MAX) : (meta.label || colKey);
        const trimmedValLabels = (!isString && meta.values && Object.keys(meta.values).length > 0)
            ? (typeof shortValueLabels === 'function' ? shortValueLabels(meta.values) : meta.values)
            : null;

        varDefs.push({
            colKey,
            shortName,
            longName,
            label: trimmedVarLabel,
            isString,
            strByteWidth,
            slotsCount,
            slotIndex: currentSlot,
            measureCode,
            hasMissingAnon: Boolean(!isString && meta.hasMissingAnon),
            values: trimmedValLabels
        });

        currentSlot += slotsCount;
    });

    const totalSlotsPerCase = currentSlot - 1;
    const nCases = codedRows.length;
    const { dateStr, timeStr } = getSpssDateTime();

    // ==================================================================
    // 1. ЗАГОЛОВОК ФАЙЛА (Header Record — 176 байт)
    // ==================================================================
    writer.writeFixedString('$FL2', 4);
    writer.writeFixedString('@(#) SPSS DATA FILE - SURVEY JS EXPORT', 60);
    writer.writeInt32(2);                 // layout_code = 2 (Little-Endian)
    writer.writeInt32(totalSlotsPerCase); // nominal_case_size
    writer.writeInt32(0);                 // compression = 0
    writer.writeInt32(0);                 // weight_index = 0
    writer.writeInt32(nCases);            // ncases
    writer.writeFloat64(100.0);           // bias = 100.0
    writer.writeFixedString(dateStr, 9);  // DD Mon YY
    writer.writeFixedString(timeStr, 8);  // HH:MM:SS
    writer.writeFixedString('Результаты опроса', 64);
    writer.writeFixedString('', 3, 0x00);

    // ==================================================================
    // 2. ЗАПИСИ ПЕРЕМЕННЫХ (Variable Records — rec_type = 2)
    // ==================================================================
    for (const v of varDefs) {
        const labelBytes = encodeUtf8Safe(v.label, 250);
        const hasLabel = labelBytes.length > 0 ? 1 : 0;
        const nMissing = v.hasMissingAnon ? 1 : 0; // 1 дискретный пропуск (99 = Аноним)

        writer.writeInt32(2); // rec_type = 2
        writer.writeInt32(v.isString ? v.strByteWidth : 0);
        writer.writeInt32(hasLabel);
        writer.writeInt32(nMissing);

        const fmtCode = v.isString
            ? ((0) | (Math.min(v.strByteWidth, 40) << 8) | (1 << 16))
            : ((0) | (8 << 8) | (5 << 16));
        writer.writeInt32(fmtCode);
        writer.writeInt32(fmtCode);
        writer.writeFixedString(v.shortName, 8);

        if (hasLabel) {
            writer.writeInt32(labelBytes.length);
            const paddedLen = Math.ceil(labelBytes.length / 4) * 4;
            writer.writeFixedString(v.label, paddedLen);
        }

        // Если в переменной есть ответы "Аноним" (99), записываем 99.0 как Missing Value для SPSS
        if (nMissing === 1) {
            writer.writeFloat64(MISSING_ANON);
        }

        for (let s = 1; s < v.slotsCount; s++) {
            writer.writeInt32(2);
            writer.writeInt32(-1);
            writer.writeInt32(0);
            writer.writeInt32(0);
            writer.writeInt32(0);
            writer.writeInt32(0);
            writer.writeFixedString('', 8);
        }
    }

    // ==================================================================
    // 3. МЕТКИ ЗНАЧЕНИЙ (Value Labels — rec_type = 3 и rec_type = 4)
    // ==================================================================
    for (const v of varDefs) {
        if (!v.values) continue;
        const entries = Object.entries(v.values);
        if (entries.length === 0) continue;

        writer.writeInt32(3);
        writer.writeInt32(entries.length);

        for (const [codeStr, lblText] of entries) {
            writer.writeFloat64(Number(codeStr));
            const lblBytes = encodeUtf8Safe(lblText, 120);
            const lenByte = lblBytes.length;
            const totalBlock = Math.ceil((1 + lenByte) / 8) * 8;
            const padCount = totalBlock - 1 - lenByte;

            writer.writeUint8(lenByte);
            writer.writeBytes(lblBytes);
            for (let p = 0; p < padCount; p++) writer.writeUint8(0x20);
        }

        writer.writeInt32(4);
        writer.writeInt32(1);
        writer.writeInt32(v.slotIndex);
    }

    // ==================================================================
    // 4. ИНФОРМАЦИОННЫЕ ЗАПИСИ (Info Records — rec_type = 7)
    // ==================================================================
    writer.writeInt32(7);
    writer.writeInt32(3);
    writer.writeInt32(4);
    writer.writeInt32(8);
    writer.writeInt32(20);
    writer.writeInt32(0);
    writer.writeInt32(0);
    writer.writeInt32(-1);
    writer.writeInt32(1);
    writer.writeInt32(1);
    writer.writeInt32(2);
    writer.writeInt32(65001);

    writer.writeInt32(7);
    writer.writeInt32(4);
    writer.writeInt32(8);
    writer.writeInt32(3);
    writer.writeFloat64(SYSMIS);
    writer.writeFloat64(HIGHEST);
    writer.writeFloat64(SYSMIS);

    writer.writeInt32(7);
    writer.writeInt32(11);
    writer.writeInt32(4);
    writer.writeInt32(varDefs.length * 3);
    for (const v of varDefs) {
        writer.writeInt32(v.measureCode);
        writer.writeInt32(v.isString ? 16 : 10);
        writer.writeInt32(v.isString ? 0 : 1);
    }

    const longNamesStr = varDefs.map(v => `${v.shortName}=${v.longName}`).join('\t');
    const longNamesBytes = spssEncoder.encode(longNamesStr);
    writer.writeInt32(7);
    writer.writeInt32(13);
    writer.writeInt32(1);
    writer.writeInt32(longNamesBytes.length);
    writer.writeBytes(longNamesBytes);

    const encBytes = spssEncoder.encode('UTF-8');
    writer.writeInt32(7);
    writer.writeInt32(20);
    writer.writeInt32(1);
    writer.writeInt32(encBytes.length);
    writer.writeBytes(encBytes);

    // ==================================================================
    // 5. ОКОНЧАНИЕ СЛОВАРЯ И ЗАПИСЬ СТРОК ДАННЫХ (rec_type = 999)
    // ==================================================================
    writer.writeInt32(999);
    writer.writeInt32(0);

    for (const row of codedRows) {
        for (const v of varDefs) {
            const val = row[v.colKey];
            if (v.isString) {
                const strVal = (val === null || val === undefined) ? '' : String(val);
                writer.writeFixedString(strVal, v.strByteWidth, 0x20);
            } else {
                if (val === null || val === undefined || val === '' || Number.isNaN(Number(val))) {
                    writer.writeFloat64(SYSMIS);
                } else {
                    writer.writeFloat64(Number(val));
                }
            }
        }
    }

    return writer.toUint8Array();
}

// Функция выгрузки готового файла FINAL_RESULTS.sav по кнопке в Админ-панели
function exportFinalSav() {
    if (!adminFilteredRows || adminFilteredRows.length === 0) {
        alert('Нет данных для выгрузки!');
        return;
    }

    const { codedRows, spssCols, fullMeta } = prepareCodedDataset(adminFilteredRows);
    const savBytes = generateSavBinary(codedRows, spssCols, fullMeta);
    const blob = new Blob([savBytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'FINAL_RESULTS.sav';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}