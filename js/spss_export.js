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
    let currentSlot = 1; // 1-based индекс слота для привязки Value Labels
    const varDefs = [];

    orderedCols.forEach((colKey, idx) => {
        const meta = fullMeta[colKey] || { label: colKey, type: 'numeric', measure: 'scale' };
        const isString = meta.type === 'string';
        // Для коротких тех. строк (Timestamp, Total_Time) выделяем 32 байта, для текстовых ответов — 240 байт
        const isShortStr = (colKey === 'Timestamp' || colKey === 'Total_Time' || colKey === 'Fast_Clicker_Detail');
        const strByteWidth = isString ? (isShortStr ? 32 : 240) : 0;
        const slotsCount = isString ? (strByteWidth / 8) : 1;

        const shortName = `V${idx + 1}`; // Уникальное 8-байтовое имя в словаре
        const longName = sanitizeSpssVarName(colKey);

        let measureCode = 3; // 3 = Scale
        if (meta.measure === 'nominal' || isString) measureCode = 1;
        else if (meta.measure === 'ordinal') measureCode = 2;

        varDefs.push({
            colKey,
            shortName,
            longName,
            label: meta.label || colKey,
            isString,
            strByteWidth,
            slotsCount,
            slotIndex: currentSlot,
            measureCode,
            values: (!isString && meta.values && Object.keys(meta.values).length > 0) ? meta.values : null
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
    writer.writeInt32(totalSlotsPerCase); // nominal_case_size (число 8-байтовых элементов на строку)
    writer.writeInt32(0);                 // compression = 0 (без сжатия, 100% совместимость)
    writer.writeInt32(0);                 // weight_index = 0
    writer.writeInt32(nCases);            // ncases (количество респондентов)
    writer.writeFloat64(100.0);           // bias = 100.0
    writer.writeFixedString(dateStr, 9);  // DD Mon YY
    writer.writeFixedString(timeStr, 8);  // HH:MM:SS
    writer.writeFixedString('Psychological Survey Data', 64);
    writer.writeFixedString('', 3, 0x00); // 3 байта выравнивания

    // ==================================================================
    // 2. ЗАПИСИ ПЕРЕМЕННЫХ (Variable Records — rec_type = 2)
    // ==================================================================
    for (const v of varDefs) {
        const labelBytes = encodeUtf8Safe(v.label, 250);
        const hasLabel = labelBytes.length > 0 ? 1 : 0;

        writer.writeInt32(2); // rec_type = 2
        writer.writeInt32(v.isString ? v.strByteWidth : 0); // 0 для чисел, длина в байтах для строк
        writer.writeInt32(hasLabel);
        writer.writeInt32(0); // n_missing_values = 0

        // Формат отображения: тип 1 (A — строка) или тип 5 (F — число F8.0)
        const fmtCode = v.isString
            ? ((0) | (Math.min(v.strByteWidth, 40) << 8) | (1 << 16))
            : ((0) | (8 << 8) | (5 << 16));
        writer.writeInt32(fmtCode); // print format
        writer.writeInt32(fmtCode); // write format
        writer.writeFixedString(v.shortName, 8);

        if (hasLabel) {
            writer.writeInt32(labelBytes.length);
            const paddedLen = Math.ceil(labelBytes.length / 4) * 4;
            writer.writeFixedString(v.label, paddedLen);
        }

        // Если переменная строковая (> 8 байт), дописываем пустые слоты продолжения (type = -1)
        for (let s = 1; s < v.slotsCount; s++) {
            writer.writeInt32(2);  // rec_type = 2
            writer.writeInt32(-1); // type = -1 (continuation slot)
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

        writer.writeInt32(3); // rec_type = 3
        writer.writeInt32(entries.length);

        for (const [codeStr, lblText] of entries) {
            writer.writeFloat64(Number(codeStr));
            const lblBytes = encodeUtf8Safe(lblText, 120); // Лимит SPSS на метку значения — 120 байт
            const lenByte = lblBytes.length;
            // Общая длина (1 байт длины + текст + пробелы) должна быть кратна 8
            const totalBlock = Math.ceil((1 + lenByte) / 8) * 8;
            const padCount = totalBlock - 1 - lenByte;

            writer.writeUint8(lenByte);
            writer.writeBytes(lblBytes);
            for (let p = 0; p < padCount; p++) writer.writeUint8(0x20);
        }

        // Привязка набора меток к слоту переменной (rec_type = 4)
        writer.writeInt32(4); // rec_type = 4
        writer.writeInt32(1); // 1 переменная
        writer.writeInt32(v.slotIndex);
    }

    // ==================================================================
    // 4. ИНФОРМАЦИОННЫЕ ЗАПИСИ (Info Records — rec_type = 7)
    // ==================================================================

    // Subtype 3: Machine Integer Info (указываем UTF-8 = 65001)
    writer.writeInt32(7);
    writer.writeInt32(3);
    writer.writeInt32(4);
    writer.writeInt32(8);
    writer.writeInt32(20);    // version_major
    writer.writeInt32(0);     // version_minor
    writer.writeInt32(0);     // version_revision
    writer.writeInt32(-1);    // machine_code
    writer.writeInt32(1);     // IEEE 754
    writer.writeInt32(1);     // compression_code
    writer.writeInt32(2);     // endianness = 2 (Little-Endian)
    writer.writeInt32(65001); // character_code = 65001 (UTF-8)

    // Subtype 4: Machine Floating-Point Info (SYSMIS, HIGHEST, LOWEST)
    writer.writeInt32(7);
    writer.writeInt32(4);
    writer.writeInt32(8);
    writer.writeInt32(3);
    writer.writeFloat64(SYSMIS);
    writer.writeFloat64(HIGHEST);
    writer.writeFloat64(SYSMIS);

    // Subtype 11: Параметры отображения переменных (Measure, Width, Alignment)
    writer.writeInt32(7);
    writer.writeInt32(11);
    writer.writeInt32(4);
    writer.writeInt32(varDefs.length * 3);
    for (const v of varDefs) {
        writer.writeInt32(v.measureCode);        // 1=Nominal, 2=Ordinal, 3=Scale
        writer.writeInt32(v.isString ? 16 : 10); // Ширина колонки в Data View
        writer.writeInt32(v.isString ? 0 : 1);   // Выравнивание: 0=Left, 1=Right
    }

    // Subtype 13: Длинные имена переменных (SHORT=LongName через табуляцию)
    const longNamesStr = varDefs.map(v => `${v.shortName}=${v.longName}`).join('\t');
    const longNamesBytes = spssEncoder.encode(longNamesStr);
    writer.writeInt32(7);
    writer.writeInt32(13);
    writer.writeInt32(1);
    writer.writeInt32(longNamesBytes.length);
    writer.writeBytes(longNamesBytes);

    // Subtype 20: Явное указание кодировки UTF-8
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

    const fullMeta = getFullSurveyMeta();
    const codedRows = adminFilteredRows.map(item => buildCodedSurveyRow(item.rawState, item.processed));
    const codedCols = getOrderedColumns(codedRows);

    const savBytes = generateSavBinary(codedRows, codedCols, fullMeta);
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