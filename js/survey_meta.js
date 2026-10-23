// ======================================================================
// СЛОВАРЬ МЕТАДАННЫХ И КОДИРОВКИ ДЛЯ SPSS (.SAV) И EXCEL CODEBOOK
// ======================================================================

// 1. Статические метаданные: Анкета, Братусь, СЖО, Мильман, ИПЛ
const STATIC_VAR_META = {
    // --- АНКЕТА ---
    Timestamp: { label: 'Дата и время прохождения опроса', type: 'string' },
    FIO:       { label: 'Анкета — Ваше имя (или псевдоним)', type: 'string' },
    Gender:    { label: 'Анкета — Пол', type: 'numeric', measure: 'nominal', values: { 1: 'Мужской', 2: 'Женский' } },
    Age:       { label: 'Анкета — Возраст (полных лет)', type: 'numeric', measure: 'scale' },
    Is_KMNS:   { label: 'Анкета — Относите ли Вы себя к коренным малочисленным народам?', type: 'numeric', measure: 'nominal', values: { 1: 'Да', 2: 'Нет' } },
    KMNS_Name: { label: 'Анкета — Какой именно коренной малочисленный народ Вы представляете', type: 'string' },
    Family:    { label: 'Анкета — Семейное положение', type: 'numeric', measure: 'nominal', values: { 1: 'Холост/Не замужем', 2: 'Женат/Замужем', 3: 'В разводе' } },
    Children:  { label: 'Анкета — Есть ли дети?', type: 'numeric', measure: 'nominal', values: { 1: 'Да', 2: 'Нет' } },
    Financial_Support: {
        label: 'Анкета — Как Вы сейчас обеспечиваете себя материально?',
        type: 'numeric', measure: 'ordinal',
        values: {
            1: 'Живу полностью на иждивении родителей',
            2: 'Живу в основном на иждивении родителей, но частично обеспечиваю себя сам',
            3: 'Большей частью обеспечиваю себя сам, но родители помогают',
            4: 'Живу самостоятельно без поддержки родителей',
            5: 'Живу самостоятельно, помогаю родителям',
            6: 'Другое'
        }
    },
    Financial_Support_Text: { label: 'Анкета — Материальное обеспечение (Другое: уточнение)', type: 'string' },
    Work: { label: 'Анкета — Работаете ли Вы?', type: 'numeric', measure: 'nominal', values: { 1: 'Да', 2: 'Нет' } },
    Work_Type: {
        label: 'Анкета — Какое описание лучше всего подходит к Вашему месту работы?',
        type: 'numeric', measure: 'nominal',
        values: {
            1: 'На госпредприятии',
            2: 'На акционерном предприятии открытого типа',
            3: 'На акционерном предприятии закрытого типа',
            4: 'ООО (ТОО)',
            5: 'Являюсь (со)владельцем предприятия, фирмы и т.п.',
            6: 'На частном предприятии',
            7: 'Занимаюсь своим бизнесом',
            8: 'Работаю на инофирме',
            9: 'Другое'
        }
    },
    Work_Type_Text: { label: 'Анкета — Место работы (Другое: уточнение)', type: 'string' },
    Work_Sphere: {
        label: 'Анкета — В какой сфере Вы работаете?',
        type: 'numeric', measure: 'nominal',
        values: {
            1: 'Образование и наука',
            2: 'Здравоохранение и социальная сфера',
            3: 'Торговля и услуги',
            4: 'Промышленность и производство',
            5: 'Нефтегазовая отрасль',
            6: 'Строительство',
            7: 'Транспорт и логистика',
            8: 'Финансы и банки',
            9: 'IT и связь',
            10: 'Государственная и муниципальная служба',
            11: 'Культура, спорт, туризм',
            12: 'Другое'
        }
    },
    Work_Sphere_Text: { label: 'Анкета — Сфера работы (Другое: уточнение)', type: 'string' },
    Edu_Status: {
        label: 'Анкета — Ваш статус обучения в ВУЗе',
        type: 'numeric', measure: 'nominal',
        values: {
            1: 'Студент (учусь сейчас)',
            2: 'Выпускник (уже закончил)',
            3: 'Не учился в ВУЗе'
        },
        // Соответствие значений из state.meta кодам
        rawMap: { 'Учусь': 1, 'Закончил': 2, 'Нет': 3 }
    },
    University: { label: 'Анкета — ВУЗ', type: 'string' },
    Speciality: { label: 'Анкета — Специальность', type: 'string' },
    Edu_Level: {
        label: 'Анкета — Уровень образования',
        type: 'numeric', measure: 'nominal',
        values: { 1: 'Бакалавриат', 2: 'Магистратура', 3: 'Специалитет' }
    },
    Edu_Basis: {
        label: 'Анкета — Основа обучения',
        type: 'numeric', measure: 'nominal',
        values: { 1: 'Бюджет', 2: 'Платное' }
    },
    Course: {
        label: 'Анкета — Курс обучения',
        type: 'numeric', measure: 'ordinal',
        values: { 1: '1 курс', 2: '2 курс', 3: '3 курс', 4: '4 курс', 5: '5 курс' }
    },
    Fast_Clicker: {
        label: 'Контроль качества — Быстрое прокликивание блоков',
        type: 'numeric', measure: 'nominal',
        values: { 0: 'No (Нормальное прохождение)', 1: 'Yes (Быстрое прокликивание)' }
    },
    Fast_Clicker_Detail: { label: 'Контроль качества — Коды быстро пройденных блоков', type: 'string' },
    Total_Time: { label: 'Общее время прохождения опроса (ММ.СС)', type: 'string' },

    // --- МЕТОДИКА КОТЛЯКОВА (БРАТУСЬ) ---
    B_Altruistic:       { label: 'Методика Котлякова (Братусь) — Альтруистические смыслы', type: 'numeric', measure: 'scale' },
    B_Existential:      { label: 'Методика Котлякова (Братусь) — Экзистенциальные смыслы', type: 'numeric', measure: 'scale' },
    B_Hedonistic:       { label: 'Методика Котлякова (Братусь) — Гедонистические смыслы', type: 'numeric', measure: 'scale' },
    'B_Self-realization': { label: 'Методика Котлякова (Братусь) — Смыслы самореализации', type: 'numeric', measure: 'scale' },
    B_Status:           { label: 'Методика Котлякова (Братусь) — Статусные смыслы', type: 'numeric', measure: 'scale' },
    B_Communicative:    { label: 'Методика Котлякова (Братусь) — Коммуникативные смыслы', type: 'numeric', measure: 'scale' },
    B_Family:           { label: 'Методика Котлякова (Братусь) — Семейные смыслы', type: 'numeric', measure: 'scale' },
    B_Cognitive:        { label: 'Методика Котлякова (Братусь) — Когнитивные смыслы', type: 'numeric', measure: 'scale' },

    B_Altruistic_Level:       { label: 'Методика Котлякова (Братусь) — Альтруистические смыслы (Уровень)', type: 'numeric', measure: 'ordinal', values: { 1: 'Доминирует', 2: 'Нейтральный', 3: 'Игнорируется' } },
    B_Existential_Level:      { label: 'Методика Котлякова (Братусь) — Экзистенциальные смыслы (Уровень)', type: 'numeric', measure: 'ordinal', values: { 1: 'Доминирует', 2: 'Нейтральный', 3: 'Игнорируется' } },
    B_Hedonistic_Level:       { label: 'Методика Котлякова (Братусь) — Гедонистические смыслы (Уровень)', type: 'numeric', measure: 'ordinal', values: { 1: 'Доминирует', 2: 'Нейтральный', 3: 'Игнорируется' } },
    'B_Self-realization_Level': { label: 'Методика Котлякова (Братусь) — Смыслы самореализации (Уровень)', type: 'numeric', measure: 'ordinal', values: { 1: 'Доминирует', 2: 'Нейтральный', 3: 'Игнорируется' } },
    B_Status_Level:           { label: 'Методика Котлякова (Братусь) — Статусные смыслы (Уровень)', type: 'numeric', measure: 'ordinal', values: { 1: 'Доминирует', 2: 'Нейтральный', 3: 'Игнорируется' } },
    B_Communicative_Level:    { label: 'Методика Котлякова (Братусь) — Коммуникативные смыслы (Уровень)', type: 'numeric', measure: 'ordinal', values: { 1: 'Доминирует', 2: 'Нейтральный', 3: 'Игнорируется' } },
    B_Family_Level:           { label: 'Методика Котлякова (Братусь) — Семейные смыслы (Уровень)', type: 'numeric', measure: 'ordinal', values: { 1: 'Доминирует', 2: 'Нейтральный', 3: 'Игнорируется' } },
    B_Cognitive_Level:        { label: 'Методика Котлякова (Братусь) — Когнитивные смыслы (Уровень)', type: 'numeric', measure: 'ordinal', values: { 1: 'Доминирует', 2: 'Нейтральный', 3: 'Игнорируется' } },

    // --- МЕТОДИКА СЖО (Д.А. ЛЕОНТЬЕВ) ---
    SJO_Goals:      { label: 'Методика СЖО — Цели в жизни', type: 'numeric', measure: 'scale' },
    SJO_Process:    { label: 'Методика СЖО — Процесс жизни (интерес и эмоциональная насыщенность)', type: 'numeric', measure: 'scale' },
    SJO_Result:     { label: 'Методика СЖО — Результативность жизни (удовлетворенность самореализацией)', type: 'numeric', measure: 'scale' },
    SJO_Locus_Self: { label: 'Методика СЖО — Локус контроля-Я (Я — хозяин жизни)', type: 'numeric', measure: 'scale' },
    SJO_Locus_Life: { label: 'Методика СЖО — Локус контроля-жизнь (управляемость жизни)', type: 'numeric', measure: 'scale' },
    SJO_Total:      { label: 'Методика СЖО — Общий показатель осмысленности жизни (ОЖ)', type: 'numeric', measure: 'scale' },

    // --- МЕТОДИКА МИЛЬМАНА ---
    'M_P_Zh-id':  { label: 'Методика Мильмана — Поддержание жизнеобеспечения Жизнь Идеал', type: 'numeric', measure: 'scale' },
    'M_P_Zh-re':  { label: 'Методика Мильмана — Поддержание жизнеобеспечения Жизнь Реальность', type: 'numeric', measure: 'scale' },
    'M_P_Rb-id':  { label: 'Методика Мильмана — Поддержание жизнеобеспечения Работа Идеал', type: 'numeric', measure: 'scale' },
    'M_P_Rb-re':  { label: 'Методика Мильмана — Поддержание жизнеобеспечения Работа Реальность', type: 'numeric', measure: 'scale' },

    'M_K_Zh-id':  { label: 'Методика Мильмана — Комфорт Жизнь Идеал', type: 'numeric', measure: 'scale' },
    'M_K_Zh-re':  { label: 'Методика Мильмана — Комфорт Жизнь Реальность', type: 'numeric', measure: 'scale' },
    'M_K_Rb-id':  { label: 'Методика Мильмана — Комфорт Работа Идеал', type: 'numeric', measure: 'scale' },
    'M_K_Rb-re':  { label: 'Методика Мильмана — Комфорт Работа Реальность', type: 'numeric', measure: 'scale' },

    'M_S_Zh-id':  { label: 'Методика Мильмана — Социальный статус Жизнь Идеал', type: 'numeric', measure: 'scale' },
    'M_S_Zh-re':  { label: 'Методика Мильмана — Социальный статус Жизнь Реальность', type: 'numeric', measure: 'scale' },
    'M_S_Rb-id':  { label: 'Методика Мильмана — Социальный статус Работа Идеал', type: 'numeric', measure: 'scale' },
    'M_S_Rb-re':  { label: 'Методика Мильмана — Социальный статус Работа Реальность', type: 'numeric', measure: 'scale' },

    'M_O_Zh-id':  { label: 'Методика Мильмана — Общение Жизнь Идеал', type: 'numeric', measure: 'scale' },
    'M_O_Zh-re':  { label: 'Методика Мильмана — Общение Жизнь Реальность', type: 'numeric', measure: 'scale' },
    'M_O_Rb-id':  { label: 'Методика Мильмана — Общение Работа Идеал', type: 'numeric', measure: 'scale' },
    'M_O_Rb-re':  { label: 'Методика Мильмана — Общение Работа Реальность', type: 'numeric', measure: 'scale' },

    'M_D_Zh-id':  { label: 'Методика Мильмана — Общая активность Жизнь Идеал', type: 'numeric', measure: 'scale' },
    'M_D_Zh-re':  { label: 'Методика Мильмана — Общая активность Жизнь Реальность', type: 'numeric', measure: 'scale' },
    'M_D_Rb-id':  { label: 'Методика Мильмана — Общая активность Работа Идеал', type: 'numeric', measure: 'scale' },
    'M_D_Rb-re':  { label: 'Методика Мильмана — Общая активность Работа Реальность', type: 'numeric', measure: 'scale' },

    'M_DR_Zh-id': { label: 'Методика Мильмана — Творческая активность Жизнь Идеал', type: 'numeric', measure: 'scale' },
    'M_DR_Zh-re': { label: 'Методика Мильмана — Творческая активность Жизнь Реальность', type: 'numeric', measure: 'scale' },
    'M_DR_Rb-id': { label: 'Методика Мильмана — Творческая активность Работа Идеал', type: 'numeric', measure: 'scale' },
    'M_DR_Rb-re': { label: 'Методика Мильмана — Творческая активность Работа Реальность', type: 'numeric', measure: 'scale' },

    'M_OD_Zh-id': { label: 'Методика Мильмана — Общественная полезность Жизнь Идеал', type: 'numeric', measure: 'scale' },
    'M_OD_Zh-re': { label: 'Методика Мильмана — Общественная полезность Жизнь Реальность', type: 'numeric', measure: 'scale' },
    'M_OD_Rb-id': { label: 'Методика Мильмана — Общественная полезность Работа Идеал', type: 'numeric', measure: 'scale' },
    'M_OD_Rb-re': { label: 'Методика Мильмана — Общественная полезность Работа Реальность', type: 'numeric', measure: 'scale' },

    M_Est:  { label: 'Методика Мильмана — Эмоциональные переживания Стенического типа', type: 'numeric', measure: 'scale' },
    M_East: { label: 'Методика Мильмана — Эмоциональные переживания Астенического типа', type: 'numeric', measure: 'scale' },
    M_Fst:  { label: 'Методика Мильмана — Переживание фрустрации Стенического типа', type: 'numeric', measure: 'scale' },
    M_Fast: { label: 'Методика Мильмана — Переживание фрустрации Астенического типа', type: 'numeric', measure: 'scale' },

    M_Profile_Zh: {
        label: 'Методика Мильмана — Тип мотивационного профиля Жизнь',
        type: 'numeric', measure: 'nominal',
        values: { 1: 'Прогрессивный', 2: 'Регрессивный', 3: 'Импульсивный', 4: 'Экспрессивный', 5: 'Уплощённый', 6: 'Неопределённый' }
    },
    M_Profile_Rb: {
        label: 'Методика Мильмана — Тип мотивационного профиля Работа',
        type: 'numeric', measure: 'nominal',
        values: { 1: 'Прогрессивный', 2: 'Регрессивный', 3: 'Импульсивный', 4: 'Экспрессивный', 5: 'Уплощённый', 6: 'Неопределённый' }
    },
    M_Emo_Profile: {
        label: 'Методика Мильмана — Тип эмоционального профиля',
        type: 'numeric', measure: 'nominal',
        values: { 1: 'Стенический', 2: 'Астенический', 3: 'Смешанный стенический', 4: 'Смешанный астенический', 5: 'Не определён' }
    },

    // --- МЕТОДИКА ИПЛ ---
    IPL_Total: { label: 'Методика ИПЛ — Интегральный показатель ИПЛ', type: 'numeric', measure: 'scale' },
    IPL_G:     { label: 'Методика ИПЛ — Гносеологический аспект ИПЛ (Г)', type: 'numeric', measure: 'scale' },
    IPL_A:     { label: 'Методика ИПЛ — Аксиологический аспект ИПЛ (А)', type: 'numeric', measure: 'scale' },
    IPL_P:     { label: 'Методика ИПЛ — Праксеологический аспект ИПЛ (П)', type: 'numeric', measure: 'scale' },

    IPL_Type_OI: { label: 'Методика ИПЛ — Осмысленно-интенсивный тип поиска информации (ОИ)', type: 'numeric', measure: 'scale' },
    IPL_Type_FN: { label: 'Методика ИПЛ — Формально-накопительский тип поиска информации (ФН)', type: 'numeric', measure: 'scale' },
    IPL_Type_PD: { label: 'Методика ИПЛ — Позитивно-дифференцированный тип оценки нового (ПД)', type: 'numeric', measure: 'scale' },
    IPL_Type_NG: { label: 'Методика ИПЛ — Негативно-генерализованный тип оценки нового (НГ)', type: 'numeric', measure: 'scale' },
    IPL_Type_IP: { label: 'Методика ИПЛ — Инициативно-преобразовательный тип деятельности (ИП)', type: 'numeric', measure: 'scale' },
    IPL_Type_VP: { label: 'Методика ИПЛ — Вынужденно-приспособительный тип деятельности (ВП)', type: 'numeric', measure: 'scale' },

    IPL_Level_Nature:  { label: 'Методика ИПЛ — Природный (средовой) уровень взаимодействия с миром', type: 'numeric', measure: 'scale' },
    IPL_Level_Social:  { label: 'Методика ИПЛ — Социальный уровень взаимодействия с миром', type: 'numeric', measure: 'scale' },
    IPL_Level_Culture: { label: 'Методика ИПЛ — Культурный уровень взаимодействия с миром', type: 'numeric', measure: 'scale' },
    IPL_Level_Life:    { label: 'Методика ИПЛ — Уровень организации собственной жизни', type: 'numeric', measure: 'scale' },

    IPL_OI_FN: {
        label: 'Методика ИПЛ — Доминирующий тип поиска информации (ОИ/ФН)',
        type: 'numeric', measure: 'nominal',
        values: { 1: 'ОИ', 2: 'ФН', 3: 'Неопределённый' }
    },
    IPL_PD_NG: {
        label: 'Методика ИПЛ — Доминирующий тип оценки нового (ПД/НГ)',
        type: 'numeric', measure: 'nominal',
        values: { 1: 'ПД', 2: 'НГ', 3: 'Неопределённый' }
    },
    IPL_IP_VP: {
        label: 'Методика ИПЛ — Доминирующий тип деятельности в новой ситуации (ИП/ВП)',
        type: 'numeric', measure: 'nominal',
        values: { 1: 'ИП', 2: 'ВП', 3: 'Неопределённый' }
    },
    IPL_Style: {
        label: 'Методика ИПЛ — Стиль реализации инновационного потенциала',
        type: 'numeric', measure: 'nominal',
        values: {
            1: 'ОИ+НГ+ВП',
            2: 'ОИ+ПД+ВП',
            3: 'ОИ+НГ+ИП',
            4: 'ОИ+ПД+ИП',
            5: 'ФН+ПД+ИП',
            6: 'ФН+НГ+ИП',
            7: 'ФН+ПД+ВП',
            8: 'ФН+НГ+ВП',
            9: 'Неопределённый'
        }
    },
    IPL_Structure: {
        label: 'Методика ИПЛ — Структура аспектов ИПЛ (по возрастанию Г, А, П)',
        type: 'numeric', measure: 'nominal',
        values: {
            1: 'Г<А<П',
            2: 'А<Г<П',
            3: 'П<Г<А',
            4: 'А<П<Г',
            5: 'Г<П<А',
            6: 'П<А<Г',
            7: 'Г=А<П',
            8: 'Г<А=П',
            9: 'А<Г=П',
            10: 'Г=П<А',
            11: 'П<Г=А',
            12: 'А=П<Г',
            13: 'Г=А=П'
        }
    }
};

// 2. Генерация подписей шкал (Value Labels) для вопросов типа scale и matrix в ECON_QS
function buildEconScaleValues(q) {
    const anchors = q.anchors || [];
    const min = q.min !== undefined ? q.min : 1;
    const max = q.max !== undefined ? q.max : 7;
    const vals = {};

    if (min === 1 && max === 7) {
        if (anchors.length === 2) {
            vals[1] = `1 — ${anchors[0]}`;
            vals[7] = `7 — ${anchors[1]}`;
        } else if (anchors.length === 3) {
            vals[1] = `1 — ${anchors[0]}`;
            vals[4] = `4 — ${anchors[1]}`;
            vals[7] = `7 — ${anchors[2]}`;
        }
    } else if (min === 0 && max === 7) {
        if (anchors.length === 3) {
            vals[0] = `0 — ${anchors[0]}`;
            vals[1] = `1 — ${anchors[1]}`;
            vals[7] = `7 — ${anchors[2]}`;
        } else if (anchors.length === 4) {
            vals[0] = `0 — ${anchors[0]}`;
            vals[1] = `1 — ${anchors[1]}`;
            vals[4] = `4 — ${anchors[2]}`;
            vals[7] = `7 — ${anchors[3]}`;
        }
    }
    return Object.keys(vals).length > 0 ? vals : null;
}

// 3. Сборка полного словаря метаданных (включая динамический обход ECON_QS из js/econ_data.js)
function getFullSurveyMeta() {
    const meta = Object.assign({}, STATIC_VAR_META);

    if (typeof ECON_QS !== 'undefined' && Array.isArray(ECON_QS)) {
        ECON_QS.forEach(q => {
            const base = `Econ_${q.id.toUpperCase()}`;
            const qTitle = `Экономическое сознание (${q.id}) — ${q.text}`;

            if (q.type === 'scale') {
                meta[base] = {
                    label: qTitle,
                    type: 'numeric',
                    measure: 'scale',
                    values: buildEconScaleValues(q)
                };
            } else if (q.type === 'number') {
                meta[base] = {
                    label: `${qTitle}${q.unit ? ' (' + q.unit + ')' : ''}`,
                    type: 'numeric',
                    measure: 'scale'
                };
            } else if (q.type === 'slider') {
                meta[base] = {
                    label: `${qTitle} (0 — ${q.left}, 100 — ${q.right})`,
                    type: 'numeric',
                    measure: 'scale',
                    values: { 0: `0 — ${q.left}`, 100: `100 — ${q.right}` }
                };
            } else if (q.type === 'single') {
                const valMap = {};
                (q.options || []).forEach((optText, i) => {
                    valMap[i + 1] = optText;
                });
                meta[base] = {
                    label: qTitle,
                    type: 'numeric',
                    measure: 'nominal',
                    values: valMap
                };
                if (q.other) {
                    meta[`${base}_Text`] = {
                        label: `${qTitle} [Другое: текст ответа]`,
                        type: 'string'
                    };
                }
            } else if (q.type === 'multi') {
                (q.options || []).forEach((optText, i) => {
                    const num = String(i + 1).padStart(2, '0');
                    meta[`${base}_${num}`] = {
                        label: `Экономическое сознание (${q.id}, в.${i + 1}) — ${optText} [${q.text}]`,
                        type: 'numeric',
                        measure: 'nominal',
                        values: { 0: 'Не выбрано', 1: 'Выбрано' }
                    };
                });
                if (q.other) {
                    meta[`${base}_Text`] = {
                        label: `${qTitle} [Другое: текст ответа]`,
                        type: 'string'
                    };
                }
            } else if (q.type === 'rank') {
                const maxRank = q.n || 7;
                const rankValues = {};
                for (let r = 1; r <= maxRank; r++) {
                    rankValues[r] = r === 1 ? '1 место (наиболее важно)' : `${r} место`;
                }
                (q.options || []).forEach((optText, i) => {
                    const num = String(i + 1).padStart(2, '0');
                    meta[`${base}_${num}`] = {
                        label: `Экономическое сознание (${q.id}, ранг: ${optText}) — ${q.text}`,
                        type: 'numeric',
                        measure: 'ordinal',
                        values: rankValues
                    };
                });
                if (q.other) {
                    meta[`${base}_Text`] = {
                        label: `${qTitle} [Другое: текст ответа]`,
                        type: 'string'
                    };
                }
            } else if (q.type === 'matrix') {
                const scaleVals = buildEconScaleValues(q);
                (q.rows || []).forEach((rowText, i) => {
                    meta[`${base}_${i + 1}`] = {
                        label: `Экономическое сознание (${q.id}.${i + 1}) — ${rowText} [${q.text}]`,
                        type: 'numeric',
                        measure: 'scale',
                        values: scaleVals
                    };
                });
            }
        });
    }

    return meta;
}

// Вспомогательная функция: поиск числового кода по текстовому значению
function findValueCode(varMeta, rawVal) {
    if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === 'Аноним' || rawVal === 'DEV') {
        return null;
    }
    if (varMeta.rawMap && varMeta.rawMap[rawVal] !== undefined) {
        return varMeta.rawMap[rawVal];
    }
    if (varMeta.values) {
        for (const [code, label] of Object.entries(varMeta.values)) {
            if (String(label).toLowerCase() === String(rawVal).trim().toLowerCase()) {
                return Number(code);
            }
        }
    }
    const num = Number(rawVal);
    return Number.isNaN(num) ? null : num;
}

// 4. Формирование оцифрованной строки для SPSS (.sav) и листа SPSS_Codes
function buildCodedSurveyRow(rawState, processedRow) {
    const fullMeta = getFullSurveyMeta();
    const meta = (rawState && rawState.meta) || {};
    const econ = (rawState && rawState.econ) || {};
    const coded = {};

    // --- 1. Анкета (с разделением "Другое" на код и _Text) ---
    coded.Timestamp = processedRow.Timestamp;
    coded.FIO = processedRow.FIO;
    coded.Gender = findValueCode(fullMeta.Gender, meta.gender);
    coded.Age = (meta.age !== undefined && meta.age !== '' && !Number.isNaN(Number(meta.age))) ? Number(meta.age) : null;
    coded.Is_KMNS = findValueCode(fullMeta.Is_KMNS, meta.is_kmns);
    coded.KMNS_Name = meta.kmns_name || '';
    coded.Family = findValueCode(fullMeta.Family, meta.family_status);
    coded.Children = findValueCode(fullMeta.Children, meta.children);

    coded.Financial_Support = findValueCode(fullMeta.Financial_Support, meta.financial_support);
    coded.Financial_Support_Text = (meta.financial_support === 'Другое' && meta.financial_support_other) ? String(meta.financial_support_other).trim() : '';

    coded.Work = findValueCode(fullMeta.Work, meta.is_working);
    coded.Work_Type = findValueCode(fullMeta.Work_Type, meta.work_type);
    coded.Work_Type_Text = (meta.work_type === 'Другое' && meta.work_type_other) ? String(meta.work_type_other).trim() : '';

    coded.Work_Sphere = findValueCode(fullMeta.Work_Sphere, meta.work_sphere);
    coded.Work_Sphere_Text = (meta.work_sphere === 'Другое' && meta.work_sphere_other) ? String(meta.work_sphere_other).trim() : '';

    coded.Edu_Status = findValueCode(fullMeta.Edu_Status, meta.edu_status);
    coded.University = (meta.university && meta.university !== 'Аноним') ? meta.university : '';
    coded.Speciality = (meta.speciality && meta.speciality !== 'Аноним') ? meta.speciality : '';
    coded.Edu_Level = findValueCode(fullMeta.Edu_Level, meta.edu_level);
    coded.Edu_Basis = findValueCode(fullMeta.Edu_Basis, meta.edu_basis);
    coded.Course = findValueCode(fullMeta.Course, meta.course);

    coded.Fast_Clicker = processedRow.Fast_Clicker === 'No' ? 0 : 1;
    coded.Fast_Clicker_Detail = processedRow.Fast_Clicker === 'No' ? '' : processedRow.Fast_Clicker;
    coded.Total_Time = processedRow.Total_Time;

    // --- 2. Экономический блок (чистые числовые коды + отдельные _Text для single с other) ---
    for (const [qid, t, n, other] of ADMIN_ECON_SCHEMA) {
        const base = `Econ_${qid.toUpperCase()}`;
        if (t === 'single') {
            const rawAns = econ[qid];
            const idx = (rawAns !== null && rawAns !== undefined && rawAns !== '') ? parseInt(rawAns, 10) : NaN;
            coded[base] = !Number.isNaN(idx) ? (idx + 1) : null;
            if (other) {
                const otherText = adminCleanText(econ[qid + '_other'] || '');
                coded[`${base}_Text`] = (!Number.isNaN(idx) && idx === n - 1 && otherText) ? otherText : '';
            }
        } else if (t === 'multi' || t === 'rank') {
            for (let i = 0; i < n; i++) {
                const num = String(i + 1).padStart(2, '0');
                const col = `${base}_${num}`;
                coded[col] = processedRow[col];
            }
            if (other) {
                const tCol = `${base}_Text`;
                coded[tCol] = processedRow[tCol] || '';
            }
        } else if (t === 'matrix') {
            for (let i = 0; i < n; i++) {
                const col = `${base}_${i + 1}`;
                const v = processedRow[col];
                coded[col] = (v !== null && v !== undefined && v !== '') ? Number(v) : null;
            }
        } else {
            const v = processedRow[base];
            coded[base] = (v !== null && v !== undefined && v !== '') ? Number(v) : null;
        }
    }

    // --- 3. Братусь, СЖО, Мильман, ИПЛ (шкалы и закодированные профили) ---
    for (const key of Object.keys(processedRow)) {
        if (key.startsWith('B_') || key.startsWith('SJO_') || key.startsWith('M_') || key.startsWith('IPL_')) {
            const varInfo = fullMeta[key];
            const val = processedRow[key];
            if (varInfo && varInfo.values) {
                coded[key] = findValueCode(varInfo, val);
            } else {
                coded[key] = (val !== null && val !== undefined && val !== '') ? Number(val) : null;
            }
        }
    }

    return coded;
}