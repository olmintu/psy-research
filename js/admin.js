// ======================================================================
// АДМИН-ПАНЕЛЬ И ОБРАБОТЧИК ДАННЫХ (ПОРТ process_survey.py)
// ======================================================================

let adminRawItems = [];     // Сырые записи: [{ uid, timestamp, data, rowIndex, manualExcluded }]
let adminParseErrors = [];  // Лог ошибок парсинга строк
let adminTableRows = [];    // Строки, отображаемые в таблице (после фильтров DEV / Fast)
let adminFilteredRows = []; // Итоговые строки, идущие на экспорт (не исключенные вручную)

// Схема экономического опросника (из process_survey.py)
const ADMIN_ECON_SCHEMA = [
    ['q1', 'multi', 13, true],
    ['q2', 'scale', 0, false],
    ['q3', 'number', 0, false],
    ['q4', 'scale', 0, false],
    ['q5', 'scale', 0, false],
    ['q6a', 'scale', 0, false],
    ['q6b', 'scale', 0, false],
    ['q7', 'single', 7, false],
    ['q8', 'multi', 9, true],
    ['q9', 'scale', 0, false],
    ['q10', 'single', 3, false],
    ['q10b', 'multi', 8, true],
    ['q11', 'rank', 17, false],
    ['q12', 'multi', 11, true],
    ['q13', 'scale', 0, false],
    ['q14', 'rank', 19, false],
    ['q15', 'scale', 0, false],
    ['q16a', 'scale', 0, false],
    ['q16b', 'scale', 0, false],
    ['q17', 'single', 5, false],
    ['q18', 'single', 8, true],
    ['q19', 'multi', 12, true],
    ['q20', 'scale', 0, false],
    ['q21', 'scale', 0, false],
    ['q22', 'scale', 0, false],
    ['q23', 'scale', 0, false],
    ['q24', 'scale', 0, false],
    ['q25', 'scale', 0, false],
    ['q26', 'single', 5, true],
    ['q27', 'multi', 8, true],
    ['q28a', 'scale', 0, false],
    ['q28b', 'scale', 0, false],
    ['q29', 'rank', 10, true],
    ['q30', 'scale', 0, false],
    ['q31', 'matrix', 3, false],
    ['q32', 'multi', 10, true],
    ['q33', 'single', 6, true],
    ['q34', 'slider', 0, false],
    ['q35', 'single', 5, false],
    ['q36', 'single', 6, true],
    ['q37', 'scale', 0, false],
    ['q38', 'scale', 0, false],
    ['q39', 'scale', 0, false],
    ['q40', 'number', 0, false],
    ['q41', 'scale', 0, false],
    ['q42', 'matrix', 7, false],
    ['q43', 'single', 8, true],
    ['q44', 'single', 8, true]
];

const ADMIN_SJO_ASC = [1, 3, 4, 8, 9, 11, 12, 16, 17];
const ADMIN_SJO_SCALES = [
    ['SJO_Goals',      [3, 4, 10, 16, 17, 18]],
    ['SJO_Process',    [1, 2, 4, 5, 7, 9]],
    ['SJO_Result',     [8, 9, 10, 12, 20]],
    ['SJO_Locus_Self', [1, 15, 16, 19]],
    ['SJO_Locus_Life', [7, 10, 11, 14, 18, 19]],
    ['SJO_Total',      Array.from({ length: 20 }, (_, i) => i + 1)]
];

const ADMIN_BLOCK_PREFIXES = ['Econ_', 'B_', 'SJO_', 'M_', 'IPL_'];

// --- Навигация в Админ-панель и обратно ---
function openAdminPanel() {
    const activeStep = document.querySelector('.step.active');
    const fromId = activeStep ? activeStep.id : 'step-form';
    switchStep(fromId, 'step-admin');
    const pb = document.querySelector('.progress-bar');
    if (pb) pb.style.display = 'none';
}

function closeAdminPanel() {
    switchStep('step-admin', 'step-form');
}

function returnToAdminPanel() {
    document.getElementById('btn-back-to-admin').style.display = 'none';
    switchStep('step-results', 'step-admin');
}

// Инициализация Drag-and-Drop и ключа облака для админки
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('admin_cloud_key');
    const keyInput = document.getElementById('admin-cloud-key');
    if (savedKey && keyInput) keyInput.value = savedKey;

    const dropZone = document.getElementById('admin-drop-zone');
    const fileInput = document.getElementById('admin-file-input');
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleAdminFiles(e.dataTransfer.files);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleAdminFiles(e.target.files);
            fileInput.value = ''; // Сбрасываем input, чтобы можно было повторно выбрать тот же файл
        }
    });
});

// Генерация уникального ключа анкеты для защиты от дублей при дозагрузке
function computeRecordUid(timestamp, data) {
    if (data && data.meta && data.meta.submission_id) {
        return 'sub_' + String(data.meta.submission_id);
    }
    const fio = (data && data.meta && data.meta.fio) ? String(data.meta.fio).trim() : '';
    const tEnd = (data && data.timing && data.timing.end) ? String(data.timing.end) : '';
    const iplStr = JSON.stringify((data && data.ipl) || {});
    return `hash_${timestamp || ''}_${fio}_${tEnd}_${iplStr}`;
}

// Добавление одной анкеты в общий список с проверкой на дубликат
function addAdminRawRecord(timestamp, data, sourceLabel) {
    const uid = computeRecordUid(timestamp, data);
    if (adminRawItems.some(item => item.uid === uid)) {
        return false; // Дубликат — пропускаем
    }
    adminRawItems.push({
        uid: uid,
        timestamp: timestamp,
        data: data,
        rowIndex: sourceLabel,
        manualExcluded: false
    });
    return true;
}

// Показ уведомления о результате добавления
function showImportNotice(addedCount, skippedCount) {
    const notice = document.getElementById('admin-import-notice');
    if (!notice) return;
    notice.style.display = 'block';
    notice.textContent = `✅ Добавлено новых анкет: ${addedCount}` + (skippedCount > 0 ? ` (пропущено дубликатов: ${skippedCount})` : '');
}

// Очистка всего списка загруженных анкет
function clearAdminData() {
    if (!confirm('Очистить весь текущий список загруженных анкет?')) return;
    adminRawItems = [];
    adminParseErrors = [];
    adminTableRows = [];
    adminFilteredRows = [];
    document.getElementById('admin-controls').style.display = 'none';
    document.getElementById('btn-clear-admin').style.display = 'none';
    document.getElementById('admin-import-notice').style.display = 'none';
}

// Чтение и ДОБАВЛЕНИЕ загруженных файлов (.xlsx / .csv / .json) к текущему списку
async function handleAdminFiles(fileList) {
    let added = 0;
    let skipped = 0;

    for (let file of fileList) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'json') {
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const ts = new Date(file.lastModified).toLocaleString('ru-RU');
                if (addAdminRawRecord(ts, data, file.name)) added++;
                else skipped++;
            } catch (err) {
                adminParseErrors.push(`Файл ${file.name}: Ошибка чтения JSON (${err.message})`);
            }
        } else {
            try {
                const buffer = await file.arrayBuffer();
                const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
                const firstSheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });

                for (let idx = 1; idx < rows.length; idx++) {
                    const row = rows[idx];
                    if (!row || row.length === 0 || (row[0] === null && row[2] === null)) continue;

                    const rawTimestamp = row[0];
                    const jsonCell = row[2];
                    if (jsonCell === null || jsonCell === undefined || String(jsonCell).trim() === '') {
                        adminParseErrors.push(`${file.name} (стр. ${idx + 1}): Пустая ячейка с JSON в столбце C`);
                        continue;
                    }

                    const jsonStr = String(jsonCell).trim();
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const ts = formatExcelTimestamp(rawTimestamp);
                        if (addAdminRawRecord(ts, parsed, `${file.name}:${idx + 1}`)) added++;
                        else skipped++;
                    } catch (jsonErr) {
                        adminParseErrors.push(`${file.name} (стр. ${idx + 1}): ${jsonErr.message}`);
                    }
                }
            } catch (err) {
                adminParseErrors.push(`Файл ${file.name}: Не удалось прочитать таблицу (${err.message})`);
            }
        }
    }

    showImportNotice(added, skipped);
    document.getElementById('admin-controls').style.display = adminRawItems.length > 0 || adminParseErrors.length > 0 ? 'block' : 'none';
    document.getElementById('btn-clear-admin').style.display = adminRawItems.length > 0 ? 'inline-block' : 'none';
    renderAdminView();
}

// Показать / скрыть секретный ключ по клику на глазик
function toggleCloudKeyVisibility() {
    const input = document.getElementById('admin-cloud-key');
    const icon = document.getElementById('admin-cloud-key-icon');
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Прямая загрузка ответов из Google Таблицы (Этап 4)
async function fetchFromGoogleSheet() {
    if (typeof GOOGLE_URL === 'undefined' || !GOOGLE_URL) {
        alert('В js/config.js не задан адрес GOOGLE_URL!');
        return;
    }
    const keyInput = document.getElementById('admin-cloud-key');
    const secretKey = keyInput ? keyInput.value.trim() : '';
    if (!secretKey) {
        alert('Введите секретный ключ доступа к Google Таблице!');
        if (keyInput) keyInput.focus();
        return;
    }
    localStorage.setItem('admin_cloud_key', secretKey);

    const statusEl = document.getElementById('admin-cloud-status');
    const btn = document.getElementById('btn-cloud-sync');
    if (statusEl) statusEl.innerHTML = '⏳ Подключение к Google Таблице...';
    if (btn) btn.disabled = true;

    try {
        const url = `${GOOGLE_URL}?action=get_all&key=${encodeURIComponent(secretKey)}`;
        const resp = await fetch(url);
        const result = await resp.json();

        if (!result.ok) {
            throw new Error(result.error || 'Неверный ключ или ошибка скрипта');
        }

        let added = 0;
        let skipped = 0;
        const rows = result.rows || [];

        rows.forEach((r, idx) => {
            if (!r.json) return;
            try {
                const parsed = typeof r.json === 'string' ? JSON.parse(r.json) : r.json;
                const ts = formatExcelTimestamp(r.timestamp);
                if (addAdminRawRecord(ts, parsed, `Cloud:${idx + 2}`)) added++;
                else skipped++;
            } catch (err) {
                adminParseErrors.push(`Google Таблица (стр. ${idx + 2}): ${err.message}`);
            }
        });

        if (statusEl) statusEl.innerHTML = `<span style="color:var(--success); font-weight:600;">Загружено из облака! (Всего строк: ${rows.length})</span>`;
        showImportNotice(added, skipped);
        document.getElementById('admin-controls').style.display = 'block';
        document.getElementById('btn-clear-admin').style.display = adminRawItems.length > 0 ? 'inline-block' : 'none';
        renderAdminView();
    } catch (err) {
        console.error('Ошибка синхронизации с Google Таблицей:', err);
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--error); font-weight:600;">Ошибка: ${err.message}</span>`;
    } finally {
        if (btn) btn.disabled = false;
    }
}

function formatExcelTimestamp(val) {
    if (val instanceof Date) {
        // Форматируем дату без сдвига в нечитаемый вид
        const pad = n => (n < 10 ? '0' + n : n);
        return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
    }
    return val !== null && val !== undefined ? String(val) : null;
}

// ======================================================================
// ПОРТ ФУНКЦИЙ РАСЧЕТА ИЗ process_survey.py
// ======================================================================

function adminWithOther(value, other) {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    const valStr = String(value);
    const otherStr = (other === null || other === undefined ? '' : String(other)).trim();
    return (valStr === 'Другое' && otherStr) ? `${valStr} (${otherStr})` : valStr;
}

function adminFastClickerStatus(flagsStr) {
    const pairs = [
        ['FAST_ECON', 'E'],
        ['FAST_SJO', 'S'],
        ['FAST_MILMAN', 'M'],
        ['FAST_IPL', 'I']
    ];
    const letters = pairs.filter(([flag]) => flagsStr.includes(flag)).map(([, letter]) => letter);
    return letters.length > 0 ? `Yes (${letters.join(',')})` : 'No';
}

function adminTotalTime(timing) {
    const val = timing && timing.total_formatted;
    return (val === null || val === undefined || val === '') ? null : String(val);
}

function adminSjoColumns(sjo) {
    const empty = {};
    ADMIN_SJO_SCALES.forEach(([name]) => { empty[name] = null; });
    if (!sjo || typeof sjo !== 'object' || Array.isArray(sjo)) return empty;

    const pos = [];
    for (let i = 0; i < 20; i++) {
        const raw = sjo[String(i)] !== undefined ? sjo[String(i)] : sjo[i];
        const p = parseInt(raw, 10);
        if (Number.isNaN(p) || p < 1 || p > 7) return empty;
        pos.push(p);
    }

    const score = (n) => ADMIN_SJO_ASC.includes(n) ? pos[n - 1] : (8 - pos[n - 1]);
    const res = {};
    ADMIN_SJO_SCALES.forEach(([name, items]) => {
        res[name] = items.reduce((acc, n) => acc + score(n), 0);
    });
    return res;
}

function adminEconColumnNames() {
    const names = [];
    for (const [qid, t, n, other] of ADMIN_ECON_SCHEMA) {
        const base = `Econ_${qid.toUpperCase()}`;
        if (t === 'matrix') {
            for (let i = 0; i < n; i++) names.push(`${base}_${i + 1}`);
        } else if (t === 'multi' || t === 'rank') {
            for (let i = 0; i < n; i++) {
                const num = String(i + 1).padStart(2, '0');
                names.push(`${base}_${num}`);
            }
            if (other) names.push(`${base}_Text`);
        } else {
            names.push(base);
        }
    }
    return names;
}

function adminCleanText(text) {
    return String(text).trim().replace(/\s+/g, ' ');
}

function adminEconColumns(econ) {
    const cols = {};
    adminEconColumnNames().forEach(name => { cols[name] = null; });
    if (!econ || typeof econ !== 'object') return cols;

    for (const [qid, t, n, other] of ADMIN_ECON_SCHEMA) {
        const a = econ[qid];
        if (a === null || a === undefined) continue;
        const otherText = adminCleanText(econ[qid + '_other'] || '');
        const base = `Econ_${qid.toUpperCase()}`;

        try {
            if (t === 'scale' || t === 'number' || t === 'slider') {
                cols[base] = a;
            } else if (t === 'single') {
                const idx = parseInt(a, 10);
                if (Number.isNaN(idx)) continue;
                let code = String(idx + 1);
                if (other && idx === n - 1 && otherText) {
                    code += ` (${otherText})`;
                }
                cols[base] = /^\d+$/.test(code) ? parseInt(code, 10) : code;
            } else if (t === 'multi') {
                if (!Array.isArray(a)) continue;
                const chosen = new Set(a.map(x => parseInt(x, 10)));
                for (let i = 0; i < n; i++) {
                    const num = String(i + 1).padStart(2, '0');
                    cols[`${base}_${num}`] = chosen.has(i) ? 1 : 0;
                }
                if (other && chosen.has(n - 1) && otherText) {
                    cols[`${base}_Text`] = otherText;
                }
            } else if (t === 'rank') {
                if (!Array.isArray(a)) continue;
                const order = a.map(x => parseInt(x, 10));
                order.forEach((optIdx, idx) => {
                    const rank = idx + 1;
                    const num = String(optIdx + 1).padStart(2, '0');
                    const key = `${base}_${num}`;
                    if (key in cols) cols[key] = rank;
                });
                if (other && order.includes(n - 1) && otherText) {
                    cols[`${base}_Text`] = otherText;
                }
            } else if (t === 'matrix') {
                if (typeof a === 'object' && !Array.isArray(a)) {
                    for (let i = 0; i < n; i++) {
                        const val = a[String(i)] !== undefined ? a[String(i)] : a[i];
                        cols[`${base}_${i + 1}`] = val !== undefined ? val : null;
                    }
                }
            }
        } catch (e) {
            console.warn(`Ошибка разбора вопроса ${qid}:`, e);
        }
    }
    return cols;
}

function adminBratusLevel(score) {
    if (score === null || score === undefined) return null;
    if (score >= 3 && score <= 9) return 'Доминирует';
    if (score >= 10 && score <= 17) return 'Нейтральный';
    if (score >= 18 && score <= 24) return 'Игнорируется';
    return null;
}

function adminMilmanMotivationalProfile(p, k, s, o, d, dr, od) {
    const vals = [p, k, s, o, d, dr, od];
    const diff = (d + dr + od) - (p + k + s);
    if (diff >= 5) return 'Прогрессивный';
    if (diff <= -5) return 'Регрессивный';

    let peaks = 0;
    for (let i = 0; i < vals.length; i++) {
        const left = i > 0 ? vals[i - 1] : null;
        const right = i < vals.length - 1 ? vals[i + 1] : null;
        if (i === 0) {
            if (right !== null && vals[i] - right >= 4) peaks++;
        } else if (i === vals.length - 1) {
            if (left !== null && vals[i] - left >= 4) peaks++;
        } else {
            if (vals[i] - left >= 2 && vals[i] - right >= 2) peaks++;
        }
    }

    if (peaks >= 3) return 'Импульсивный';
    if (peaks === 2) return 'Экспрессивный';
    if (Math.max(...vals) - Math.min(...vals) <= 3) return 'Уплощённый';
    return 'Неопределённый';
}

function adminMilmanEmotionalProfile(e_st, e_ast, f_st, f_ast) {
    const emoEq = (e_st === e_ast);
    const fruEq = (f_st === f_ast);
    if (emoEq && fruEq) return 'Не определён';

    const emoSten = e_st > e_ast;
    const fruSten = f_st > f_ast;

    if (emoEq) return fruSten ? 'Смешанный стенический' : 'Смешанный астенический';
    if (fruEq) return emoSten ? 'Смешанный астенический' : 'Смешанный стенический';

    if (emoSten && fruSten) return 'Стенический';
    if (!emoSten && !fruSten) return 'Астенический';
    if (!emoSten && fruSten) return 'Смешанный стенический';
    return 'Смешанный астенический';
}

function adminIplDimension(a, b, labelA, labelB) {
    if (a > b) return labelA;
    if (b > a) return labelB;
    return 'Неопределённый';
}

function adminIplFullStyle(oi_fn, pd_ng, ip_vp) {
    if ([oi_fn, pd_ng, ip_vp].includes('Неопределённый')) return 'Неопределённый';
    return `${oi_fn}+${pd_ng}+${ip_vp}`;
}

function adminIplStructure(g, a, p) {
    const components = [['Г', g], ['А', a], ['П', p]];
    components.sort((x, y) => x[1] - y[1]);
    const parts = [components[0][0]];
    for (let i = 1; i < 3; i++) {
        const sep = components[i][1] === components[i - 1][1] ? '=' : '<';
        parts.push(sep, components[i][0]);
    }
    return parts.join('');
}

// Обработка одной анкеты (1-в-1 как итерация в process_survey.py)
function processSingleSurveyRecord(timestamp, data) {
    const meta = data.meta || {};
    const fastStatus = adminFastClickerStatus(String(meta.flags || ''));

    const res = {
        Timestamp: timestamp,
        FIO: meta.fio ?? null,
        Gender: meta.gender ?? null,
        Age: meta.age !== undefined && meta.age !== '' && !Number.isNaN(Number(meta.age)) ? Number(meta.age) : (meta.age ?? null),
        Is_KMNS: meta.is_kmns ?? null,
        KMNS_Name: meta.kmns_name ?? '',
        Family: meta.family_status ?? null,
        Children: meta.children ?? null,
        Financial_Support: adminWithOther(meta.financial_support, meta.financial_support_other),
        Work: meta.is_working ?? null,
        Work_Type: adminWithOther(meta.work_type, meta.work_type_other),
        Work_Sphere: adminWithOther(meta.work_sphere, meta.work_sphere_other),
        Edu_Status: meta.edu_status ?? null,
        University: meta.university ?? null,
        Speciality: meta.speciality ?? null,
        Edu_Level: meta.edu_level ?? null,
        Edu_Basis: meta.edu_basis ?? null,
        Course: meta.course !== undefined && meta.course !== '' && !Number.isNaN(Number(meta.course)) ? Number(meta.course) : (meta.course ?? null),
        Fast_Clicker: fastStatus,
        Total_Time: adminTotalTime(data.timing)
    };

    // --- 2. БРАТУСЬ ---
    const cats = {
        'Altruistic': [1, 9, 17],
        'Existential': [2, 10, 18],
        'Hedonistic': [3, 11, 19],
        'Self-realization': [4, 12, 20],
        'Status': [5, 13, 21],
        'Communicative': [6, 14, 22],
        'Family': [7, 15, 23],
        'Cognitive': [8, 16, 24]
    };

    const bratusRaw = data.bratus || {};
    const idToRank = {};
    for (const [rankStr, ids] of Object.entries(bratusRaw)) {
        if (Array.isArray(ids)) {
            ids.forEach(qId => { idToRank[qId] = parseInt(rankStr, 10); });
        }
    }
    for (const [catName, qIds] of Object.entries(cats)) {
        res[`B_${catName}`] = qIds.reduce((sum, q) => sum + (idToRank[q] || 0), 0);
    }

    // --- 3. МИЛЬМАН ---
    const milmanRaw = data.milman || {};
    const qSubscales = {
        0: 'Zh-id', 4: 'Zh-id', 8: 'Zh-id',
        1: 'Rb-id', 5: 'Rb-id', 9: 'Rb-id',
        2: 'Zh-re', 6: 'Zh-re', 10: 'Zh-re',
        3: 'Rb-re', 7: 'Rb-re', 11: 'Rb-re'
    };
    const scalesList = ['P', 'K', 'S', 'O', 'D', 'DR', 'OD'];
    const subsList = ['Zh-id', 'Zh-re', 'Rb-id', 'Rb-re'];

    const mScores = {};
    scalesList.forEach(s => {
        mScores[s] = {};
        subsList.forEach(sub => { mScores[s][sub] = 0; });
    });
    const emoScores = { E: { st: 0, ast: 0 }, F: { st: 0, ast: 0 } };

    for (let qIdx = 0; qIdx < 14; qIdx++) {
        for (let optIdx = 0; optIdx < 8; optIdx++) {
            const val = Number(milmanRaw[`${qIdx}_${optIdx}`] || 0);
            const rawKeyStr = m_keys[qIdx][optIdx]; // из js/data.js
            const currentKeys = rawKeyStr.split(',').map(k => k.trim());

            for (const key of currentKeys) {
                if (key === '-') continue;
                if (qIdx < 12) {
                    const sub = qSubscales[qIdx];
                    if (sub && mScores[key]) mScores[key][sub] += val;
                } else {
                    const typ = qIdx === 12 ? 'E' : 'F';
                    if (emoScores[typ][key] !== undefined) emoScores[typ][key] += val;
                }
            }
        }
    }

    scalesList.forEach(s => {
        subsList.forEach(sub => {
            res[`M_${s}_${sub}`] = mScores[s][sub];
        });
    });
    res['M_Est'] = emoScores.E.st;
    res['M_East'] = emoScores.E.ast;
    res['M_Fst'] = emoScores.F.st;
    res['M_Fast'] = emoScores.F.ast;

    // --- 4. ИПЛ ---
    let iplRaw = data.ipl || [];
    if (!Array.isArray(iplRaw) && typeof iplRaw === 'object') {
        iplRaw = Array.from({ length: 36 }, (_, i) => Number(iplRaw[String(i)] || iplRaw[i] || 0));
    }

    const A = (q) => (q - 1 < iplRaw.length ? Number(iplRaw[q - 1] || 0) : 0);
    const iplTypes = {
        OI: A(8) + A(13) + A(17) + A(21) + A(30) + A(34),
        FN: A(1) + A(5) + A(16) + A(24) + A(25) + A(32),
        PD: A(2) + A(6) + A(18) + A(19) + A(23) + A(29),
        NG: A(9) + A(14) + A(22) + A(27) + A(28) + A(33),
        IP: A(3) + A(4) + A(11) + A(12) + A(35) + A(36),
        VP: A(7) + A(10) + A(15) + A(20) + A(26) + A(31)
    };

    const reverseIdx = [0, 4, 6, 8, 9, 13, 14, 15, 19, 21, 23, 24, 25, 26, 27, 30, 31, 32];
    const processedIpl = iplRaw.map((score, i) => reverseIdx.includes(i) ? (6 - Number(score)) : Number(score));

    const gIdx = [0, 4, 7, 12, 15, 16, 20, 23, 24, 29, 31, 33];
    const aIdx = [1, 5, 8, 13, 17, 18, 21, 22, 26, 27, 28, 32];
    const pIdx = [2, 3, 6, 9, 10, 11, 14, 19, 25, 30, 34, 35];
    const natureLevelIdx = [0, 5, 6, 7, 11, 18, 20, 27, 34];
    const socialLevelIdx = [1, 4, 8, 10, 21, 25, 30, 31, 33];
    const cultureLevelIdx = [2, 9, 12, 13, 15, 19, 22, 23, 26];
    const lifeLevelIdx = [3, 14, 16, 17, 24, 28, 29, 32, 35];

    const sumIdx = (arr) => arr.reduce((acc, i) => acc + (processedIpl[i] || 0), 0);

    res['IPL_Total'] = processedIpl.reduce((a, b) => a + b, 0);
    res['IPL_G'] = sumIdx(gIdx);
    res['IPL_A'] = sumIdx(aIdx);
    res['IPL_P'] = sumIdx(pIdx);

    res['IPL_Type_OI'] = iplTypes.OI;
    res['IPL_Type_FN'] = iplTypes.FN;
    res['IPL_Type_PD'] = iplTypes.PD;
    res['IPL_Type_NG'] = iplTypes.NG;
    res['IPL_Type_IP'] = iplTypes.IP;
    res['IPL_Type_VP'] = iplTypes.VP;

    res['IPL_Level_Nature'] = sumIdx(natureLevelIdx);
    res['IPL_Level_Social'] = sumIdx(socialLevelIdx);
    res['IPL_Level_Culture'] = sumIdx(cultureLevelIdx);
    res['IPL_Level_Life'] = sumIdx(lifeLevelIdx);

    // --- СЖО и Экономический опросник ---
    Object.assign(res, adminSjoColumns(data.sjo));
    Object.assign(res, adminEconColumns(data.econ));

    // --- 5. ПРОИЗВОДНЫЕ ТИПЫ И ПРОФИЛИ ---
    for (const catName of Object.keys(cats)) {
        res[`B_${catName}_Level`] = adminBratusLevel(res[`B_${catName}`]);
    }

    const mZh = {};
    const mRb = {};
    scalesList.forEach(s => {
        mZh[s] = res[`M_${s}_Zh-id`] + res[`M_${s}_Zh-re`];
        mRb[s] = res[`M_${s}_Rb-id`] + res[`M_${s}_Rb-re`];
    });

    res['M_Profile_Zh'] = adminMilmanMotivationalProfile(mZh.P, mZh.K, mZh.S, mZh.O, mZh.D, mZh.DR, mZh.OD);
    res['M_Profile_Rb'] = adminMilmanMotivationalProfile(mRb.P, mRb.K, mRb.S, mRb.O, mRb.D, mRb.DR, mRb.OD);
    res['M_Emo_Profile'] = adminMilmanEmotionalProfile(res['M_Est'], res['M_East'], res['M_Fst'], res['M_Fast']);

    res['IPL_OI_FN'] = adminIplDimension(res['IPL_Type_OI'], res['IPL_Type_FN'], 'ОИ', 'ФН');
    res['IPL_PD_NG'] = adminIplDimension(res['IPL_Type_PD'], res['IPL_Type_NG'], 'ПД', 'НГ');
    res['IPL_IP_VP'] = adminIplDimension(res['IPL_Type_IP'], res['IPL_Type_VP'], 'ИП', 'ВП');
    res['IPL_Style'] = adminIplFullStyle(res['IPL_OI_FN'], res['IPL_PD_NG'], res['IPL_IP_VP']);
    res['IPL_Structure'] = adminIplStructure(res['IPL_G'], res['IPL_A'], res['IPL_P']);

    return res;
}

// Сортировка колонок как в order_columns(df) из process_survey.py
function getOrderedColumns(rows) {
    if (!rows || rows.length === 0) return [];
    const cols = Object.keys(rows[0]);
    const ordered = cols.filter(c => !ADMIN_BLOCK_PREFIXES.some(p => c.startsWith(p)));
    for (const prefix of ADMIN_BLOCK_PREFIXES) {
        ordered.push(...cols.filter(c => c.startsWith(prefix)));
    }
    return ordered;
}

// Включить или исключить одного респондента по галочке в строке
function toggleRespondentRow(uid, isChecked) {
    const found = adminRawItems.find(item => item.uid === uid);
    if (found) {
        found.manualExcluded = !isChecked;
        renderAdminView();
    }
}

// Включить или исключить всех видимых в таблице респондентов
function toggleAllRespondents(isChecked) {
    const visibleUids = new Set(adminTableRows.map(r => r.uid));
    adminRawItems.forEach(item => {
        if (visibleUids.has(item.uid)) {
            item.manualExcluded = !isChecked;
        }
    });
    renderAdminView();
}

// Полное удаление респондента из загруженного списка
function deleteRespondentRow(uid) {
    adminRawItems = adminRawItems.filter(item => item.uid !== uid);
    if (adminRawItems.length === 0) {
        document.getElementById('btn-clear-admin').style.display = 'none';
    }
    renderAdminView();
}

// Отрисовка статистики и таблицы в Админ-панели
function renderAdminView() {
    const excludeDev = document.getElementById('admin-filter-dev').checked;
    const excludeFast = document.getElementById('admin-filter-fast').checked;

    adminTableRows = [];
    adminFilteredRows = [];
    let devCount = 0;
    let fastCount = 0;
    let manualExcludedCount = 0;

    adminRawItems.forEach((item) => {
        const isDev = (item.data.meta && (item.data.meta.mode === 'dev' || item.data.meta.fio === 'DEV'));
        if (isDev) devCount++;

        const processed = processSingleSurveyRecord(item.timestamp, item.data);
        const isFast = processed.Fast_Clicker !== 'No';
        if (isFast) fastCount++;

        if (excludeDev && isDev) return;
        if (excludeFast && isFast) return;

        const rowObj = {
            uid: item.uid,
            manualExcluded: Boolean(item.manualExcluded),
            processed: processed,
            rawState: item.data
        };

        adminTableRows.push(rowObj);
        if (item.manualExcluded) {
            manualExcludedCount++;
        } else {
            adminFilteredRows.push(rowObj);
        }
    });

    // Синхронизируем главный чекбокс в шапке таблицы
    const checkAllEl = document.getElementById('admin-check-all');
    if (checkAllEl) {
        checkAllEl.checked = adminTableRows.length > 0 && manualExcludedCount === 0;
    }

    // Сводная статистика
    const totalSelected = adminFilteredRows.length;
    const kmnsYes = adminFilteredRows.filter(r => r.processed.Is_KMNS === 'Да').length;

    const statsEl = document.getElementById('admin-stats');
    statsEl.innerHTML = `
        <div class="admin-stat-card">
            <div class="admin-stat-val">${adminRawItems.length}</div>
            <div class="admin-stat-lbl">Всего в списке</div>
        </div>
        <div class="admin-stat-card">
            <div class="admin-stat-val" style="color:var(--success);">${totalSelected}</div>
            <div class="admin-stat-lbl">Идет в выгрузку (.xlsx / .sav)</div>
        </div>
        <div class="admin-stat-card">
            <div class="admin-stat-val">${kmnsYes}</div>
            <div class="admin-stat-lbl">Группа КМНС («Да»)</div>
        </div>
        <div class="admin-stat-card">
            <div class="admin-stat-val" style="color:var(--warning);">${devCount} / ${fastCount} / ${manualExcludedCount}</div>
            <div class="admin-stat-lbl">DEV / Быстрые / Искл. вручную</div>
        </div>
    `;

    // Лог ошибок
    const errBox = document.getElementById('admin-errors-box');
    if (adminParseErrors.length > 0) {
        errBox.style.display = 'block';
        errBox.innerHTML = `<b>⚠️ Ошибки при чтении строк (${adminParseErrors.length}):</b><br>` + adminParseErrors.join('<br>');
    } else {
        errBox.style.display = 'none';
    }

    // Таблица предпросмотра
    const tbody = document.getElementById('admin-preview-tbody');
    tbody.innerHTML = '';
    adminTableRows.forEach((item, idx) => {
        const p = item.processed;
        const tr = document.createElement('tr');
        if (item.manualExcluded) tr.className = 'admin-row-excluded';

        const fastBadge = p.Fast_Clicker === 'No'
            ? `<span class="score-badge bg-green">No</span>`
            : `<span class="score-badge bg-red">${p.Fast_Clicker}</span>`;

        const safeUid = item.uid.replace(/'/g, "\\'");

        // Короткий формат пола (М / Ж) и компактная дата без секунд
        const shortGender = p.Gender === 'Мужской' ? 'М' : (p.Gender === 'Женский' ? 'Ж' : (p.Gender || '—'));
        const shortDate = p.Timestamp ? String(p.Timestamp).replace(/:\d{2}$/, '') : '—';
        const sjoScore = p.SJO_Total !== null && p.SJO_Total !== undefined ? p.SJO_Total : '—';
        const iplScore = p.IPL_Total || '—';

        tr.innerHTML = `
            <td style="text-align:center;">
                <input type="checkbox" ${item.manualExcluded ? '' : 'checked'} onchange="toggleRespondentRow('${safeUid}', this.checked)" style="width:18px; height:18px; cursor:pointer; accent-color:var(--primary);">
            </td>
            <td>${idx + 1}</td>
            <td style="color:var(--text-muted); font-size:0.82rem;" title="${p.Timestamp || ''}">${shortDate}</td>
            <td style="max-width:170px; overflow:hidden; text-overflow:ellipsis;">
                <a href="javascript:void(0)" onclick="openRespondentReport(${idx})" style="color:var(--primary); font-weight:600; text-decoration:none;" title="Нажмите, чтобы открыть отчет: ${p.FIO || ''}">
                    ${p.FIO || '—'}
                </a>
            </td>
            <td>${shortGender}, ${p.Age || '—'}</td>
            <td>${p.Is_KMNS || '—'}</td>
            <td>${p.Total_Time || '—'}</td>
            <td>${fastBadge}</td>
            <td><b>${sjoScore}</b> <span style="color:var(--text-muted);">/</span> <b>${iplScore}</b></td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn btn-next" style="padding:5px 10px; font-size:0.8rem; width:auto;" onclick="openRespondentReport(${idx})" title="Открыть профиль и графики">
                        👁️ Отчет
                    </button>
                    <button type="button" class="btn btn-red" style="margin-top:0; padding:5px 9px; font-size:0.8rem; width:auto;" onclick="deleteRespondentRow('${safeUid}')" title="Удалить строку из списка">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Открыть индивидуальный отчет любого респондента прямо из таблицы админки
function openRespondentReport(idx) {
    const item = adminTableRows[idx];
    if (!item) return;
    state = JSON.parse(JSON.stringify(item.rawState));
    document.getElementById('btn-back-to-admin').style.display = 'inline-block';
    switchStep('step-admin', 'step-results');
    calculateAndShowResults(true);
}

// Вспомогательная защита от формул (аналог escape_formulas из process_survey.py)
function escapeSheetFormulas(ws) {
    if (!ws || !ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[addr];
            if (cell && typeof cell.v === 'string' && cell.v.startsWith('=')) {
                cell.t = 's';
                delete cell.f;
            }
        }
    }
}

let currentExcelSheetMode = 2; // По умолчанию: 2 листа (Данные + Кодировка)

function toggleExcelDropdown(e) {
    e.stopPropagation();
    const menu = document.getElementById('excel-dropdown-menu');
    if (menu) menu.classList.toggle('open');
}

function selectAndExportExcel(mode) {
    currentExcelSheetMode = mode;
    const labels = { 1: '1 лист', 2: '2 листа', 3: '3 листа' };
    const badge = document.getElementById('excel-mode-badge');
    if (badge) badge.textContent = labels[mode] || '2 листа';

    document.querySelectorAll('#excel-dropdown-menu .excel-menu-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.mode, 10) === mode);
    });

    const menu = document.getElementById('excel-dropdown-menu');
    if (menu) menu.classList.remove('open');

    exportFinalExcel(mode);
}

// Закрываем меню при клике в любое место вне кнопки
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('excel-split-wrap');
    const menu = document.getElementById('excel-dropdown-menu');
    if (wrap && menu && !wrap.contains(e.target)) {
        menu.classList.remove('open');
    }
});

// Экспорт готового файла FINAL_RESULTS.xlsx с выбором количества листов (1, 2 или 3)
function exportFinalExcel(forcedMode) {
    if (adminFilteredRows.length === 0) {
        alert('Нет данных для выгрузки!');
        return;
    }

    const sheetMode = forcedMode || currentExcelSheetMode || 2;

    const wb = XLSX.utils.book_new();
    const { codedRows, spssCols, baseCols, fullMeta } = prepareCodedDataset(adminFilteredRows);

    // 1. Лист 1: Классическая таблица результатов (1-в-1 как в process_survey.py)
    const rowsData = adminFilteredRows.map(item => item.processed);
    const sheetMatrix = [baseCols];
    for (const r of rowsData) {
        sheetMatrix.push(baseCols.map(col => (r[col] !== undefined && r[col] !== null) ? r[col] : ''));
    }
    const wsClassic = XLSX.utils.aoa_to_sheet(sheetMatrix);
    escapeSheetFormulas(wsClassic);
    XLSX.utils.book_append_sheet(wb, wsClassic, 'Sheet1');

    // 2. Если выбран режим "3 листа" — добавляем лист с числовыми кодами SPSS_Codes
    if (sheetMode === 3) {
        const codedMatrix = [spssCols];
        for (const r of codedRows) {
            codedMatrix.push(spssCols.map(col => (r[col] !== undefined && r[col] !== null) ? r[col] : ''));
        }
        const wsCoded = XLSX.utils.aoa_to_sheet(codedMatrix);
        escapeSheetFormulas(wsCoded);
        XLSX.utils.book_append_sheet(wb, wsCoded, 'SPSS_Codes');
    }

    // 3. Если выбран режим "2 листа" или "3 листа" — добавляем лист «Кодировка» (как add_codebook в process_survey (2).py)
    if (sheetMode >= 2) {
        const codebookMatrix = [
            ['Переменная', 'Подпись (полный текст)', 'Значения (код = текст)']
        ];
        const colsForCodebook = sheetMode === 3 ? spssCols : baseCols;

        for (const c of colsForCodebook) {
            const info = fullMeta[c] || {};
            let vals = info.values ? Object.assign({}, info.values) : null;
            if (info.options && !vals) {
                vals = Object.fromEntries(info.options.map((o, i) => [i + 1, o]));
            }
            if (info.kind && info.kind.startsWith('category') && vals) {
                vals[MISSING_ANON] = 'Аноним (не указал)';
            }
            const valsText = vals
                ? Object.entries(vals).map(([k, v]) => `${k} = ${v}`).join('\n')
                : '';

            codebookMatrix.push([
                c,
                info.full || info.label || '',
                valsText
            ]);
        }
        const wsCodebook = XLSX.utils.aoa_to_sheet(codebookMatrix);
        escapeSheetFormulas(wsCodebook);
        XLSX.utils.book_append_sheet(wb, wsCodebook, 'Кодировка');
    }

    XLSX.writeFile(wb, 'FINAL_RESULTS.xlsx');
}