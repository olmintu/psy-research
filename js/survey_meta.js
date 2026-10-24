// ======================================================================
// СЛОВАРЬ МЕТАДАННЫХ И КОДИРОВКИ 
// ======================================================================

const LABEL_MAX = 128;
const VALUE_MAX = 60;
const MISSING_ANON = 99;

// Утилиты очистки и умного сокращения текста по границе слова 
function metaClean(text) {
    return String(text || '').trim().replace(/\s+/g, ' ');
}

function metaTrim(text, limit) {
    text = metaClean(text);
    if (text.length <= limit) return text;
    let head = text.slice(0, limit - 1);
    const lastSpace = head.lastIndexOf(' ');
    if (lastSpace > 0) head = head.slice(0, lastSpace);
    return head.replace(/[ ,;:—\-(\[]+$/, '') + '…';
}

function econNum(qid) {
    const s = qid.slice(1);
    const last = s.slice(-1);
    if (last === 'a') return s.slice(0, -1) + 'а';
    if (last === 'b') return s.slice(0, -1) + 'б';
    return s;
}

function econStem(q) {
    return metaClean(String(q.text || '').replace(/\s*\((?:Выберите|Укажите|Можно|Отметьте|Обведите)[^)]*\)/gi, ''));
}

function composeEconLabel(num, main, stem) {
    const head = `Q${num}. ${main}`;
    const room = LABEL_MAX - head.length - 3;
    return (room >= 12 && head.length < LABEL_MAX) ? `${head} [${metaTrim(stem, room)}]` : head;
}

// Сокращение меток значений до 60 символов с защитой от совпадений после обрезки
function shortValueLabels(values) {
    if (!values) return null;
    const out = {};
    for (const [k, v] of Object.entries(values)) {
        out[k] = metaTrim(v, VALUE_MAX);
    }
    const seen = {};
    for (const [k, t] of Object.entries(out)) {
        if (!seen[t]) seen[t] = [];
        seen[t].push(k);
    }
    for (const [t, ks] of Object.entries(seen)) {
        if (ks.length > 1) {
            for (const k of ks) {
                out[k] = metaTrim(`${k}. ${values[k]}`, VALUE_MAX);
            }
        }
    }
    return out;
}

// --- 1. Списки и константы  ---
const META_FINANCIAL_SUPPORT = [
    'Живу полностью на иждивении родителей',
    'Живу в основном на иждивении родителей, но частично обеспечиваю себя сам',
    'Большей частью обеспечиваю себя сам, но родители помогают',
    'Живу самостоятельно без поддержки родителей',
    'Живу самостоятельно, помогаю родителям',
    'Другое'
];
const META_WORK_TYPE = [
    'На госпредприятии',
    'На акционерном предприятии открытого типа',
    'На акционерном предприятии закрытого типа',
    'ООО (ТОО)',
    'Являюсь (со)владельцем предприятия, фирмы и т.п.',
    'На частном предприятии',
    'Занимаюсь своим бизнесом',
    'Работаю на инофирме',
    'Другое'
];
const META_WORK_SPHERE = [
    'Образование и наука',
    'Здравоохранение и социальная сфера',
    'Торговля и услуги',
    'Промышленность и производство',
    'Нефтегазовая отрасль',
    'Строительство',
    'Транспорт и логистика',
    'Финансы и банки',
    'IT и связь',
    'Государственная и муниципальная служба',
    'Культура, спорт, туризм',
    'Другое'
];

const META_ANKETA = {
    Timestamp:         ['Дата и время прохождения', 'datetime', null],
    FIO:               ['ФИО', 'text', null],
    Gender:            ['Пол', 'category', ['Мужской', 'Женский']],
    Age:               ['Возраст (полных лет)', 'number', null],
    Is_KMNS:           ['Относится к коренным малочисленным народам', 'category', ['Да', 'Нет']],
    KMNS_Name:         ['Название народа', 'text', null],
    Family:            ['Семейное положение', 'category', ['Холост/Не замужем', 'Женат/Замужем', 'В разводе']],
    Children:          ['Есть ли дети', 'category', ['Да', 'Нет']],
    Financial_Support: ['Источник материального обеспечения', 'category_other', META_FINANCIAL_SUPPORT],
    Work:              ['Работает ли в настоящее время', 'category', ['Да', 'Нет']],
    Work_Type:         ['Где работает (тип предприятия)', 'category_other', META_WORK_TYPE],
    Work_Sphere:       ['Сфера работы', 'category_other', META_WORK_SPHERE],
    Edu_Status:        ['Статус обучения', 'category', ['Учусь', 'Закончил', 'Нет']],
    University:        ['Вуз', 'text', null],
    Speciality:        ['Специальность', 'text', null],
    Edu_Level:         ['Уровень образования', 'category', ['Бакалавриат', 'Магистратура', 'Специалитет']],
    Edu_Basis:         ['Основа обучения', 'category', ['Бюджет', 'Платное']],
    Course:            ['Курс', 'number', null],
    Fast_Clicker:      ['Слишком быстрое прохождение (E - экономика, S - СЖО, M - Мильман, I - ИПЛ)', 'text', null],
    Total_Time:        ['Общее время прохождения (минуты.секунды)', 'text', null]
};

const META_BRATUS_NAMES = [
    ['Altruistic', 'Альтруистические смыслы'],
    ['Existential', 'Экзистенциальные смыслы'],
    ['Hedonistic', 'Гедонистические смыслы'],
    ['Self-realization', 'Смыслы самореализации'],
    ['Status', 'Статусные смыслы'],
    ['Communicative', 'Коммуникативные смыслы'],
    ['Family', 'Семейные смыслы'],
    ['Cognitive', 'Когнитивные смыслы']
];
const META_BRATUS_LEVELS = ['Доминирует', 'Нейтральный', 'Игнорируется'];

const META_MILMAN_SCALES = [
    ['P', 'Поддержание жизнеобеспечения'],
    ['K', 'Комфорт'],
    ['S', 'Социальный статус'],
    ['O', 'Общение'],
    ['D', 'Общая активность'],
    ['DR', 'Творческая активность'],
    ['OD', 'Общественная польза']
];
const META_MILMAN_SUBS = [
    ['Zh-id', 'Жизнь Идеал'],
    ['Zh-re', 'Жизнь Реальность'],
    ['Rb-id', 'Работа Идеал'],
    ['Rb-re', 'Работа Реальность']
];
const META_MILMAN_EMO = [
    ['Est', 'Эмоциональные переживания Стенического типа'],
    ['East', 'Эмоциональные переживания Астенического типа'],
    ['Fst', 'Эмоциональные реакции на стресс Стенического типа'],
    ['Fast', 'Эмоциональные реакции на стресс Астенического типа']
];
const META_MILMAN_PROFILES = ['Прогрессивный', 'Регрессивный', 'Импульсивный', 'Экспрессивный', 'Уплощённый', 'Неопределённый'];
const META_MILMAN_EMO_PROFILE = ['Стенический', 'Астенический', 'Смешанный стенический', 'Смешанный астенический', 'Не определён'];

const META_IPL_TYPES = [
    ['OI', 'ОИ', 'осмысленно-интенсивный'],
    ['FN', 'ФН', 'формально-накопительский'],
    ['PD', 'ПД', 'позитивно-дифференцированный'],
    ['NG', 'НГ', 'негативно-генерализованный'],
    ['IP', 'ИП', 'инициативно-преобразовательный'],
    ['VP', 'ВП', 'вынужденно-приспособительный']
];
const META_IPL_LEVELS = [
    ['Nature', 'природный (средовой)'],
    ['Social', 'социальный'],
    ['Culture', 'культурный'],
    ['Life', 'организация собственной жизни']
];
const META_IPL_STYLES_LIST = [
    'ОИ+НГ+ВП', 'ОИ+ПД+ВП', 'ОИ+НГ+ИП', 'ОИ+ПД+ИП',
    'ФН+ПД+ИП', 'ФН+НГ+ИП', 'ФН+ПД+ВП', 'ФН+НГ+ВП',
    'Неопределённый'
];
const META_IPL_STRUCTURES_LIST = [
    'Г<А<П', 'А<Г<П', 'П<Г<А', 'А<П<Г', 'Г<П<А', 'П<А<Г',
    'Г=А<П', 'Г<А=П', 'А<Г=П', 'Г=П<А', 'П<Г=А', 'А=П<Г', 'Г=А=П'
];

const META_SJO_LABELS = [
    ['SJO_Goals', 'Цели в жизни'],
    ['SJO_Process', 'Процесс жизни'],
    ['SJO_Result', 'Результативность жизни'],
    ['SJO_Locus_Self', 'Локус контроля-Я'],
    ['SJO_Locus_Life', 'Локус контроля-жизнь'],
    ['SJO_Total', 'Общий показатель осмысленности жизни (ОЖ)']
];

// Сборка полного словаря метаданных 
function getFullSurveyMeta() {
    const m = {};

    // 1. Анкета
    for (const [name, [label, kind, opts]] of Object.entries(META_ANKETA)) {
        const valMap = opts ? Object.fromEntries(opts.map((o, i) => [i + 1, o])) : null;
        m[name] = {
            label,
            full: label,
            kind,
            type: (kind === 'text' || kind === 'datetime') ? 'string' : 'numeric',
            measure: kind === 'number' ? 'scale' : 'nominal',
            options: opts,
            values: valMap
        };
        if (kind === 'category_other') {
            m[`${name}_Text`] = {
                label: `${label}: текст ответа «другое»`,
                full: `${label}: текст ответа «другое»`,
                kind: 'text',
                type: 'string',
                measure: 'nominal'
            };
        }
    }

    // 2. Братусь
    for (const [key, name] of META_BRATUS_NAMES) {
        m[`B_${key}`] = {
            label: `Методика Котлякова (Братусь) — ${name}`,
            full: `Методика Котлякова (Братусь) — ${name}`,
            kind: 'number', type: 'numeric', measure: 'scale'
        };
        m[`B_${key}_Level`] = {
            label: `Методика Котлякова (Братусь) — ${name}: уровень`,
            full: `Методика Котлякова (Братусь) — ${name}: уровень`,
            kind: 'category_ord', type: 'numeric', measure: 'ordinal',
            options: META_BRATUS_LEVELS,
            values: Object.fromEntries(META_BRATUS_LEVELS.map((o, i) => [i + 1, o]))
        };
    }

    // 3. Мильман
    for (const [code, name] of META_MILMAN_SCALES) {
        for (const [sub, subname] of META_MILMAN_SUBS) {
            const lbl = `Методика Мильмана — ${name} ${subname}`;
            m[`M_${code}_${sub}`] = { label: lbl, full: lbl, kind: 'number', type: 'numeric', measure: 'scale' };
        }
    }
    for (const [key, name] of META_MILMAN_EMO) {
        const lbl = `Методика Мильмана — ${name}`;
        m[`M_${key}`] = { label: lbl, full: lbl, kind: 'number', type: 'numeric', measure: 'scale' };
    }
    m['M_Profile_Zh'] = {
        label: 'Методика Мильмана — Профиль мотивации (Жизнь)',
        full: 'Методика Мильмана — Профиль мотивации (Жизнь)',
        kind: 'category', type: 'numeric', measure: 'nominal',
        options: META_MILMAN_PROFILES,
        values: Object.fromEntries(META_MILMAN_PROFILES.map((o, i) => [i + 1, o]))
    };
    m['M_Profile_Rb'] = {
        label: 'Методика Мильмана — Профиль мотивации (Работа)',
        full: 'Методика Мильмана — Профиль мотивации (Работа)',
        kind: 'category', type: 'numeric', measure: 'nominal',
        options: META_MILMAN_PROFILES,
        values: Object.fromEntries(META_MILMAN_PROFILES.map((o, i) => [i + 1, o]))
    };
    m['M_Emo_Profile'] = {
        label: 'Методика Мильмана — Эмоциональный профиль',
        full: 'Методика Мильмана — Эмоциональный профиль',
        kind: 'category', type: 'numeric', measure: 'nominal',
        options: META_MILMAN_EMO_PROFILE,
        values: Object.fromEntries(META_MILMAN_EMO_PROFILE.map((o, i) => [i + 1, o]))
    };

    // 4. ИПЛ
    m['IPL_Total'] = { label: 'Методика ИПЛ — Общий показатель', full: 'Методика ИПЛ — Общий показатель', kind: 'number', type: 'numeric', measure: 'scale' };
    m['IPL_G'] = { label: 'Методика ИПЛ — Гносеологический аспект ИПЛ (Г)', full: 'Методика ИПЛ — Гносеологический аспект ИПЛ (Г)', kind: 'number', type: 'numeric', measure: 'scale' };
    m['IPL_A'] = { label: 'Методика ИПЛ — Аксиологический аспект ИПЛ (А)', full: 'Методика ИПЛ — Аксиологический аспект ИПЛ (А)', kind: 'number', type: 'numeric', measure: 'scale' };
    m['IPL_P'] = { label: 'Методика ИПЛ — Праксеологический аспект ИПЛ (П)', full: 'Методика ИПЛ — Праксеологический аспект ИПЛ (П)', kind: 'number', type: 'numeric', measure: 'scale' };

    for (const [key, short, full] of META_IPL_TYPES) {
        const lbl = `Методика ИПЛ — Тип реализации: ${full} (${short})`;
        m[`IPL_Type_${key}`] = { label: lbl, full: lbl, kind: 'number', type: 'numeric', measure: 'scale' };
    }
    for (const [key, name] of META_IPL_LEVELS) {
        const lbl = `Методика ИПЛ — Уровень взаимодействия: ${name}`;
        m[`IPL_Level_${key}`] = { label: lbl, full: lbl, kind: 'number', type: 'numeric', measure: 'scale' };
    }

    const iplPairs = [
        ['IPL_OI_FN', META_IPL_TYPES[0], META_IPL_TYPES[1]],
        ['IPL_PD_NG', META_IPL_TYPES[2], META_IPL_TYPES[3]],
        ['IPL_IP_VP', META_IPL_TYPES[4], META_IPL_TYPES[5]]
    ];
    for (const [col, a, b] of iplPairs) {
        const opts = [`${a[1]} — ${a[2]}`, `${b[1]} — ${b[2]}`, 'Неопределённый'];
        const raw = [a[1], b[1], 'Неопределённый'];
        const lbl = `Методика ИПЛ — Преобладающий тип в паре ${a[1]} / ${b[1]}`;
        m[col] = {
            label: lbl, full: lbl,
            kind: 'category', type: 'numeric', measure: 'nominal',
            options: opts, raw: raw,
            values: { 1: opts[0], 2: opts[1], 3: opts[2] }
        };
    }

    // IPL_Style и IPL_Structure кодируем числами с Value Labels для совместимости с критериями в SPSS
    m['IPL_Style'] = {
        label: 'Методика ИПЛ — Стиль реализации (сочетание типов)',
        full: 'Методика ИПЛ — Стиль реализации (сочетание типов)',
        kind: 'category', type: 'numeric', measure: 'nominal',
        options: META_IPL_STYLES_LIST,
        values: Object.fromEntries(META_IPL_STYLES_LIST.map((o, i) => [i + 1, o]))
    };
    m['IPL_Structure'] = {
        label: 'Методика ИПЛ — Структура аспектов (Г, А, П)',
        full: 'Методика ИПЛ — Структура аспектов (Г, А, П)',
        kind: 'category', type: 'numeric', measure: 'nominal',
        options: META_IPL_STRUCTURES_LIST,
        values: Object.fromEntries(META_IPL_STRUCTURES_LIST.map((o, i) => [i + 1, o]))
    };

    // 5. СЖО
    for (const [col, name] of META_SJO_LABELS) {
        const lbl = `Методика СЖО (Д.А. Леонтьев) — ${name}`;
        m[col] = { label: lbl, full: lbl, kind: 'number', type: 'numeric', measure: 'scale' };
    }

    // 6. Экономический опросник 
    if (typeof ECON_QS !== 'undefined' && Array.isArray(ECON_QS)) {
        for (const q of ECON_QS) {
            const qid = q.id;
            const t = q.type;
            const base = `Econ_${qid.toUpperCase()}`;
            const num = econNum(qid);
            const stem = econStem(q);
            const full = `Q${num}. ${stem}`;
            const smin = q.min !== undefined ? q.min : 1;
            const smax = q.max !== undefined ? q.max : 7;

            if (t === 'scale') {
                const anchors = q.anchors || [];
                const vals = anchors.length >= 2 ? { [smin]: anchors[0], [smax]: anchors[anchors.length - 1] } : null;
                m[base] = { label: full, full: full, kind: 'scale', type: 'numeric', measure: 'ordinal', values: vals };
            } else if (t === 'number') {
                const lbl = `${full} (руб. в месяц)`;
                m[base] = { label: lbl, full: lbl, kind: 'number', type: 'numeric', measure: 'scale' };
            } else if (t === 'slider') {
                m[base] = {
                    label: full, full: full, kind: 'number', type: 'numeric', measure: 'scale',
                    values: { 0: q.left || 'самые бедные', 100: q.right || 'самые богатые' }
                };
            } else if (t === 'single') {
                const opts = q.options || [];
                m[base] = {
                    label: full, full: full, kind: 'single', type: 'numeric', measure: 'nominal',
                    options: opts, other: Boolean(q.other),
                    values: Object.fromEntries(opts.map((o, i) => [i + 1, o]))
                };
                if (q.other) {
                    const tLbl = composeEconLabel(num, 'Текст ответа «другое»', stem);
                    m[`${base}_Text`] = {
                        label: tLbl, full: `${full} — текст ответа «другое»`,
                        kind: 'text', type: 'string', measure: 'nominal'
                    };
                }
            } else if (t === 'multi') {
                const opts = q.options || [];
                opts.forEach((opt, i) => {
                    const col = `${base}_${String(i + 1).padStart(2, '0')}`;
                    m[col] = {
                        label: composeEconLabel(num, opt, stem),
                        full: `${full} — ${opt}`,
                        kind: 'bin', type: 'numeric', measure: 'nominal',
                        values: { 0: 'не выбран', 1: 'выбран' }
                    };
                });
                if (q.other) {
                    m[`${base}_Text`] = {
                        label: composeEconLabel(num, 'Текст ответа «другое»', stem),
                        full: `${full} — текст ответа «другое»`,
                        kind: 'text', type: 'string', measure: 'nominal'
                    };
                }
            } else if (t === 'rank') {
                const rankN = q.n || 7;
                const vals = {};
                for (let r = 1; r <= rankN; r++) {
                    vals[r] = r === 1 ? 'ранг 1 (самое важное)' : `ранг ${r}`;
                }
                (q.options || []).forEach((opt, i) => {
                    const col = `${base}_${String(i + 1).padStart(2, '0')}`;
                    m[col] = {
                        label: composeEconLabel(num, opt, stem),
                        full: `${full} — ${opt}`,
                        kind: 'rank', type: 'numeric', measure: 'ordinal',
                        values: vals
                    };
                });
                if (q.other) {
                    m[`${base}_Text`] = {
                        label: composeEconLabel(num, 'Текст ответа «другое»', stem),
                        full: `${full} — текст ответа «другое»`,
                        kind: 'text', type: 'string', measure: 'nominal'
                    };
                }
            } else if (t === 'matrix') {
                const anchors = q.anchors || [];
                const vals = anchors.length >= 2 ? { [smin]: anchors[0], [smax]: anchors[anchors.length - 1] } : null;
                (q.rows || []).forEach((rowTxt, i) => {
                    const col = `${base}_${i + 1}`;
                    m[col] = {
                        label: composeEconLabel(num, rowTxt, stem),
                        full: `${full} — ${rowTxt}`,
                        kind: 'scale', type: 'numeric', measure: 'ordinal',
                        values: vals
                    };
                });
            }
        }
    }

    return m;
}

// Подготовка полного пакета оцифрованных данных и динамических меток (включая код 99 для Анонима и 100+ для нестандартных ответов)
function prepareCodedDataset(filteredItems) {
    const fullMeta = getFullSurveyMeta();
    const processedRows = filteredItems.map(item => item.processed);
    const baseCols = getOrderedColumns(processedRows);

    // Расширяем список колонок для SPSS: после category_other и single с other идет колонка _Text
    const spssCols = [];
    for (const col of baseCols) {
        spssCols.push(col);
        const info = fullMeta[col];
        if (info && (info.kind === 'category_other' || (info.kind === 'single' && info.other))) {
            const txtCol = `${col}_Text`;
            if (!baseCols.includes(txtCol)) spssCols.push(txtCol);
        }
    }

    // Инициализируем пустые строки для SPSS
    const codedRows = filteredItems.map(() => ({}));

    for (const col of baseCols) {
        const info = fullMeta[col] || { label: col, full: col, kind: 'number', type: 'numeric', measure: 'scale' };
        const kind = info.kind;

        if (kind === 'datetime' || kind === 'text') {
            processedRows.forEach((r, idx) => {
                const v = r[col];
                codedRows[idx][col] = (v === null || v === undefined) ? '' : String(v);
            });
        } else if (kind === 'category' || kind === 'category_ord' || kind === 'category_other') {
            const opts = info.options || [];
            const rawList = info.raw || opts;
            const lookup = {};
            rawList.forEach((valStr, i) => { lookup[String(valStr).toLowerCase()] = i + 1; });

            const labelsMap = {};
            opts.forEach((optStr, i) => { labelsMap[i + 1] = optStr; });

            const extra = {};
            let hasAnon = false;

            processedRows.forEach((r, idx) => {
                const rawVal = r[col];
                if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '' || rawVal === 'DEV') {
                    codedRows[idx][col] = null;
                    if (kind === 'category_other') codedRows[idx][`${col}_Text`] = '';
                    return;
                }
                let s = String(rawVal).trim();
                let otherTxt = '';

                if (s === 'Аноним') {
                    hasAnon = true;
                    codedRows[idx][col] = MISSING_ANON;
                    if (kind === 'category_other') codedRows[idx][`${col}_Text`] = '';
                    return;
                }

                if (kind === 'category_other') {
                    const mo = s.match(/^Другое \(([\s\S]*)\)$/);
                    if (mo) {
                        s = 'Другое';
                        otherTxt = mo[1].trim();
                    }
                    codedRows[idx][`${col}_Text`] = otherTxt;
                }

                const keyLower = s.toLowerCase();
                if (lookup[keyLower] !== undefined) {
                    codedRows[idx][col] = lookup[keyLower];
                } else {
                    if (extra[s] === undefined) {
                        const newCode = 100 + Object.keys(extra).length;
                        extra[s] = newCode;
                        labelsMap[newCode] = s;
                    }
                    codedRows[idx][col] = extra[s];
                }
            });

            if (hasAnon) {
                labelsMap[MISSING_ANON] = 'Аноним (не указал)';
                info.hasMissingAnon = true;
            }
            info.values = labelsMap;
        } else if (kind === 'single') {
            processedRows.forEach((r, idx) => {
                const rawVal = r[col];
                if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
                    codedRows[idx][col] = null;
                    if (info.other) codedRows[idx][`${col}_Text`] = '';
                    return;
                }
                if (typeof rawVal === 'number') {
                    codedRows[idx][col] = rawVal;
                    if (info.other) codedRows[idx][`${col}_Text`] = '';
                    return;
                }
                const mo = String(rawVal).trim().match(/^(\d+)(?: \(([\s\S]*)\))?$/);
                if (mo) {
                    codedRows[idx][col] = parseInt(mo[1], 10);
                    if (info.other) codedRows[idx][`${col}_Text`] = mo[2] ? mo[2].trim() : '';
                } else {
                    codedRows[idx][col] = null;
                    if (info.other) codedRows[idx][`${col}_Text`] = String(rawVal);
                }
            });
        } else {
            // Числа, шкалы, ранги, 0/1
            processedRows.forEach((r, idx) => {
                const v = r[col];
                const num = (v !== null && v !== undefined && v !== '') ? Number(v) : NaN;
                codedRows[idx][col] = Number.isNaN(num) ? null : num;
            });
        }
    }

    return { codedRows, spssCols, baseCols, fullMeta };
}