// ======================================================================
// ЭКОНОМИЧЕСКОЕ САМООПРЕДЕЛЕНИЕ: профиль респондента (типы, полоски, таблица ответов)
//
// ВАЖНО: у опросника нет ключей и норм. Типы ниже - обобщение ответов по простым правилам,
// придуманным авторами сайта (не частью методики). Это не диагноз и не оценка.
// Все правила описаны в ECON_RULES и выводятся в «Подробнее» и в PDF, чтобы любой ярлык можно было проверить.
//
// calcEconProfile(E) принимает state.econ и возвращает { dims, bars, rows } или null, если ответы неполные.
// ======================================================================

// ---------- вспомогательное ----------
const ecN = (E, id) => (E[id] - econQ[id].min) / (econQ[id].max - econQ[id].min);   // положение на шкале 0..1
const ecMean = a => a.reduce((s, x) => s + x, 0) / a.length;
const ecThird = n => (n <= 1 / 3 + 1e-9 ? 'low' : (n >= 2 / 3 - 1e-9 ? 'high' : 'mid'));   // нижняя треть / середина / верхняя треть шкалы
const ecOpt = (id, i) => econQ[id].options[i];
const ecList = (id, arr, E, max) => (arr || []).slice(0, max || 99).map(i => (econQ[id].options.length - 1 === i && E[id + '_other']) ? '«' + E[id + '_other'] + '»' : ecOpt(id, i)).join('; ');

// Полнота ответов: все видимые вопросы отвечены
function econCompleteFor(E) {
    if (!E) return false;
    const saved = state.econ;
    state.econ = E;
    try { return ECON_QS.filter(q => econVisible(q)).every(q => econIsAnswered(q)); }
    finally { state.econ = saved; }
}

// Группы пунктов (номера вариантов с 0)
const EC_WEALTH = { free: [3, 6, 7], work: [0, 2, 11], assets: [1, 8, 9, 10], care: [4, 5] };            // Q1
const EC_VALUES = { material: [5, 10, 11], people: [1, 4, 16], growth: [3, 7, 8, 9, 12, 15], life: [0, 2, 6, 13, 14] };   // Q11 (17 ценностей)
const EC_CAREER = { interest: [3, 6], calc: [0, 1, 8], family: [2, 4], demand: [7], forced: [5], other: [9] };   // Q29

// ---------- правила (выводятся в «Подробнее» и в PDF) ----------
const ECON_RULES = [
    'Положение на шкале: нижняя треть шкалы, середина или верхняя треть (для шкалы 1–7: 1–3, 4, 5–7; для шкалы 0–7: 0–2, 3–4, 5–7).',
    'Отношение к деньгам: по вопросу 42 считаются среднее по суждениям 1–3 («негативные»), суждению 4 («средство») и суждениям 5–7 («ценность»). Деньги — ценность: «ценность» ≥ 5 и «негативные» ≤ 3,5. Настороженность: «негативные» ≥ 5 и «ценность» ≤ 3,5. Двойственное отношение: оба ≥ 4,5. Иначе — инструмент.',
    'Что для Вас богатство: по вопросу 1 выбранные варианты делятся на группы: свобода (не думать о завтрашнем дне, путешествовать, жить где хочется), дело и доход (прибыльное дело, высокооплачиваемая работа, ценные бумаги), имущество (вещи, недвижимость, счёт в иностранном банке, валюта), помощь другим (близким и общественные нужды). Побеждает группа с большим числом выборов, при равенстве — выбранная раньше.',
    'Оценка своего достатка: среднее положения на шкалах вопросов 4 и 39, ползунка вопроса 34 и выбранной группы в вопросе 44 (если выбрано не «другое»). Скромный / средний / высокий достаток — нижняя треть / середина / верхняя треть. Разница вопросов 43 и 44 показывается, если группы отличаются хотя бы на 1.',
    'Отношение к богатым и бедным: по вопросам 30 и 38 (оценка 5–7 — тёплое отношение, 1–3 — сдержанное). Разница с тем, как, по Вашему мнению, относятся окружающие (вопросы 25 и 37), показывается при отличии от 2 пунктов.',
    'Отношение к экономическому риску: по вопросам 15, 16а, 16б. Готов рисковать: желание и оптимальный риск ≥ 5. Осторожный: оба ≤ 2. Иначе — взвешенный. Разница оптимального и реального риска показывается при отличии от 2 пунктов.',
    'Предприимчивость: среднее положения на шкалах вопросов 13, 9, 28а, 28б и отношения к конкуренции (вопрос 35). Нижняя треть / середина / верхняя треть: ценитель стабильности / практик / предприниматель по складу.',
    'Главные жизненные ценности: в вопросе 11 ценности делятся на 4 группы (материальное: богатство, собственность, обеспеченность; люди: семья, друзья, счастье других; развитие и свобода: познание, свобода, мудрость, красота, творчество, уверенность в себе; здоровье и активная жизнь: здоровье, активная жизнь, работа, развлечения, бессмертие). Ранг 1 даёт 7 баллов, ранг 7 — 1 балл. Выделяется группа, доля баллов которой минимум в 1,3 раза больше доли её ценностей в списке; если такой нет — равновесие.',
    'Мотивы выбора профессии: по первому варианту в вопросе 29: интерес и способности — «по призванию»; заработок, престиж, положение — «по расчёту»; советы родителей и семейные традиции — «под влиянием семьи»; востребованность — «вслед за спросом»; «не было другого выбора» — «так сложилось».'
];

// ---------- типы ----------
function ecMoney(E) {
    const r = E.q42, N = ecMean([r[0], r[1], r[2]]), V = ecMean([r[4], r[5], r[6]]);
    let id, name, text;
    if (V >= 5 && N <= 3.5)      { id = 'value';   name = 'Деньги — ценность';        text = 'Вы склонны видеть в деньгах не только средство, но и источник значимости и содержательной жизни.'; }
    else if (N >= 5 && V <= 3.5) { id = 'distrust'; name = 'Настороженность к деньгам'; text = 'Вы чаще связываете деньги с негативными последствиями — для людей и для общества.'; }
    else if (V >= 4.5 && N >= 4.5) { id = 'mixed';  name = 'Двойственное отношение';  text = 'Деньги для Вас и притягательны, и тревожны: Вы видите в них и силу, и опасность.'; }
    else                         { id = 'tool';     name = 'Деньги — инструмент';      text = 'Вы относитесь к деньгам прагматично: это средство существования, а не главная цель.'; }
    const facts = ['Значимость денег для Вас: ' + E.q2 + ' из 7 · желание иметь деньги: ' + E.q41 + ' из 7'];
    let mi = 0; for (let i = 1; i < 7; i++) if (r[i] > r[mi]) mi = i;
    if (r[mi] >= 5) facts.push('Ближе всего Вам суждение: «' + econQ.q42.rows[mi] + '»');
    return { key: 'money', emoji: '💰', topic: 'Отношение к деньгам', type: { id: id, name: name }, text: text, facts: facts };
}
function ecWealth(E) {
    const picks = (E.q1 || []).filter(i => i !== 12);
    let id, name, text;
    if (!picks.length) {
        return { key: 'wealth', emoji: '💎', topic: 'Что для Вас богатство', type: { id: 'own', name: 'Своё понимание богатства' },
                 text: 'Вы описали богатство по-своему' + (E.q1_other ? ': «' + E.q1_other + '».' : '.'), facts: [] };
    }
    const cnt = {}, first = {};
    Object.keys(EC_WEALTH).forEach(k => { cnt[k] = 0; });
    picks.forEach((i, pos) => Object.keys(EC_WEALTH).forEach(k => { if (EC_WEALTH[k].includes(i)) { cnt[k]++; if (first[k] === undefined) first[k] = pos; } }));
    const best = Object.keys(EC_WEALTH).sort((a, b) => (cnt[b] - cnt[a]) || ((first[a] === undefined ? 99 : first[a]) - (first[b] === undefined ? 99 : first[b])))[0];
    const T = {
        free:   ['Богатство — это свобода', 'Для Вас богатство прежде всего свобода: не думать о завтрашнем дне, путешествовать, жить там, где хочется.'],
        work:   ['Богатство — это дело и доход', 'Для Вас богатство — это прибыльное дело, хороший заработок и работающий капитал.'],
        assets: ['Богатство — это имущество', 'Для Вас богатство — это осязаемые активы и статус: недвижимость, вещи, валюта, счета.'],
        care:   ['Богатство — это возможность помогать', 'Для Вас богатство измеряется тем, чем можно поделиться: помочь близким и обществу.']
    };
    return { key: 'wealth', emoji: '💎', topic: 'Что для Вас богатство', type: { id: best, name: T[best][0] }, text: T[best][1],
             facts: ['Вы выбрали: ' + ecList('q1', E.q1, E)] };
}
function ecStatus(E) {
    const parts = [ecN(E, 'q4'), ecN(E, 'q39'), E.q34 / 100];
    if (E.q44 <= 6) parts.push(E.q44 / 6);
    const S = ecMean(parts), lv = ecThird(S);
    const T = { low: ['Скромный достаток', 'Вы оцениваете своё материальное положение как скромное.'], mid: ['Средний достаток', 'Вы оцениваете своё материальное положение как среднее.'], high: ['Высокий достаток', 'Вы оцениваете своё материальное положение как высокое.'] };
    const facts = ['Это Ваша самооценка, а не фактический доход. Положение на шкале «от самых бедных к самым богатым»: ' + E.q34 + '%'];
    if (E.q43 <= 6 && E.q44 <= 6) {
        const d = E.q43 - E.q44;
        if (d >= 1) facts.push('Окружающие, по Вашему мнению, видят Вас состоятельнее, чем Вы сами себя (' + ecOpt('q43', E.q43) + ' против «' + ecOpt('q44', E.q44) + '»).');
        else if (d <= -1) facts.push('Окружающие, по Вашему мнению, видят Вас менее состоятельным, чем Вы сами себя (' + ecOpt('q43', E.q43) + ' против «' + ecOpt('q44', E.q44) + '»).');
        else facts.push('Окружающие, по Вашему мнению, видят Вас так же, как Вы сами себя.');
    }
    return { key: 'status', emoji: '🏠', topic: 'Оценка своего достатка', type: { id: lv, name: T[lv][0] }, text: T[lv][1], facts: facts, S: S };
}
function ecPeople(E) {
    const rich = E.q30, poor = E.q38;
    let id, name, text;
    if (rich >= 5 && poor >= 5)      { id = 'open';    name = 'Открытый ко всем';       text = 'Вы доброжелательны и к состоятельным, и к небогатым людям.'; }
    else if (rich >= 5 && poor <= 3) { id = 'success'; name = 'Тянется к успеху';       text = 'Вам ближе состоятельные люди, к небогатым Вы относитесь более сдержанно.'; }
    else if (rich <= 3 && poor >= 5) { id = 'simple';  name = 'На стороне небогатых';   text = 'Вы теплее относитесь к небогатым людям, чем к состоятельным.'; }
    else if (rich <= 3 && poor <= 3) { id = 'reserved'; name = 'Сдержанный к обеим группам'; text = 'К состоятельным и небогатым людям Вы относитесь сдержанно.'; }
    else                             { id = 'neutral'; name = 'Ровное отношение';       text = 'Вы относитесь к богатым и бедным ровно, без выраженных симпатий.'; }
    const facts = [];
    const dr = rich - E.q25, dp = poor - E.q37;
    if (dr >= 2) facts.push('К состоятельным Вы относитесь теплее, чем, по Вашему мнению, большинство окружающих.');
    else if (dr <= -2) facts.push('К состоятельным Вы относитесь прохладнее, чем, по Вашему мнению, большинство окружающих.');
    if (dp >= 2) facts.push('К небогатым Вы относитесь теплее, чем, по Вашему мнению, большинство окружающих.');
    else if (dp <= -2) facts.push('К небогатым Вы относитесь прохладнее, чем, по Вашему мнению, большинство окружающих.');
    if (!facts.length) facts.push('Ваше отношение близко к тому, как, по Вашему мнению, относятся окружающие.');
    return { key: 'people', emoji: '🤝', topic: 'Отношение к богатым и бедным', type: { id: id, name: name }, text: text, facts: facts };
}
function ecRisk(E) {
    const D = E.q15, R = E.q16a, O = E.q16b;
    let id, name, text;
    if (D >= 5 && O >= 5)      { id = 'bold';     name = 'Готов рисковать'; text = 'Вас привлекает экономический риск ради доходов, и высокий риск Вы считаете для себя оправданным.'; }
    else if (D <= 2 && O <= 2) { id = 'careful';  name = 'Осторожный';      text = 'Вы предпочитаете надёжность: риск ради дохода Вас не привлекает.'; }
    else                       { id = 'balanced'; name = 'Взвешенный';      text = 'Вы готовы рисковать в меру, оценивая, что можно выиграть и потерять.'; }
    const facts = ['Желание рисковать: ' + D + ' из 7 · риск сейчас: ' + R + ' · оптимальный для Вас: ' + O];
    if (O - R >= 2) facts.push('Оптимальный для Вас риск выше, чем тот, который Вы испытываете сейчас.');
    else if (R - O >= 2) facts.push('Вы рискуете больше, чем считаете для себя оптимальным.');
    else facts.push('Ваш реальный риск близок к оптимальному.');
    return { key: 'risk', emoji: '🎲', topic: 'Отношение к экономическому риску', type: { id: id, name: name }, text: text, facts: facts };
}
function ecEnterprise(E) {
    const P = ecMean([ecN(E, 'q13'), ecN(E, 'q9'), E.q35 / 4, ecN(E, 'q28a'), ecN(E, 'q28b')]), lv = ecThird(P);
    const T = {
        high: ['Предприниматель по складу', 'Вам близки собственное дело, соревнование и личная инициатива.'],
        mid:  ['Практик', 'Вы открыты к собственному делу и конкуренции, но без фанатизма.'],
        low:  ['Ценитель стабильности', 'Вам комфортнее предсказуемость и стабильность, чем гонка и собственное дело.']
    };
    const facts = ['Отношение к конкуренции: «' + ecOpt('q35', E.q35) + '»'];
    facts.push('Желание быть собственником: ' + E.q13 + ' из 7 · где хотелось бы работать: ' + ecList('q27', E.q27, E, 3));
    return { key: 'enterprise', emoji: '🚀', topic: 'Предприимчивость', type: { id: lv, name: T[lv][0] }, text: T[lv][1], facts: facts, P: P };
}
function ecValues(E) {
    const arr = E.q11, pts = {}, total = arr.reduce((s, _, k) => s + (7 - k), 0);
    Object.keys(EC_VALUES).forEach(k => { pts[k] = 0; });
    arr.forEach((i, k) => Object.keys(EC_VALUES).forEach(g => { if (EC_VALUES[g].includes(i)) pts[g] += 7 - k; }));
    let best = null, bestRatio = 0;
    Object.keys(EC_VALUES).forEach(g => { const ratio = (pts[g] / total) / (EC_VALUES[g].length / 17); if (ratio > bestRatio) { bestRatio = ratio; best = g; } });
    const T = {
        material: ['Опора на материальное', 'В Вашем списке главных ценностей заметно выделяются богатство, собственность и обеспеченность.'],
        people:   ['Люди прежде всего', 'В Вашем списке главных ценностей на первом плане семья, друзья и счастье других людей.'],
        growth:   ['Развитие и свобода', 'В Вашем списке главных ценностей на первом плане познание, свобода, творчество и уверенность в себе.'],
        life:     ['Здоровье и активная жизнь', 'В Вашем списке главных ценностей на первом плане здоровье, активная жизнь, работа и впечатления.'],
        balanced: ['Ценности в равновесии', 'Ни одна группа ценностей не перевешивает: Ваши приоритеты распределены ровно.']
    };
    const g = bestRatio >= 1.3 ? best : 'balanced';
    const top3 = arr.slice(0, 3).map((i, k) => (k + 1) + '. ' + ecOpt('q11', i)).join(' · ');
    const rich = arr.indexOf(5);
    return { key: 'values', emoji: '🧭', topic: 'Главные жизненные ценности', type: { id: g, name: T[g][0] }, text: T[g][1],
             facts: ['Первая тройка: ' + top3, rich >= 0 ? '«Богатство» в Вашем списке на ' + (rich + 1) + '-м месте из 7.' : '«Богатство» не вошло в Ваши 7 главных ценностей.'] };
}
function ecCareer(E) {
    const first = E.q29[0];
    let g = 'other';
    Object.keys(EC_CAREER).forEach(k => { if (EC_CAREER[k].includes(first)) g = k; });
    const T = {
        interest: ['По призванию', 'При выборе специальности Вы прежде всего шли за интересом и возможностью реализовать способности.'],
        calc:     ['По расчёту', 'При выборе специальности для Вас главным были заработок, престиж и положение в обществе.'],
        family:   ['Под влиянием семьи', 'При выборе специальности для Вас были важны советы родителей и семейные традиции.'],
        demand:   ['Вслед за спросом', 'При выборе специальности Вы ориентировались на востребованность профессии обществом.'],
        forced:   ['Так сложилось', 'Выбор специальности был во многом вынужденным: другого варианта не было.'],
        other:    ['Свой особый мотив', 'У Вашего выбора специальности был особый мотив' + (E.q29_other ? ': «' + E.q29_other + '».' : '.')]
    };
    const second = E.q29[1] !== undefined ? ecList('q29', [E.q29[1]], E) : '';
    return { key: 'career', emoji: '🎓', topic: 'Мотивы выбора профессии', type: { id: g, name: T[g][0] }, text: T[g][1],
             facts: ['Главный мотив: ' + ecList('q29', [first], E) + (second ? ' · следом: ' + second : '')] };
}

// ---------- ответы в читаемом виде (для таблицы в PDF) ----------
function ecAnswerText(q, E) {
    const a = E[q.id], other = E[q.id + '_other'];
    const withOther = (i) => (q.options.length - 1 === i && q.other && other) ? q.options[i] + ': ' + other : q.options[i];
    switch (q.type) {
        case 'scale': return a + ' (шкала ' + q.min + '–' + q.max + ')';
        case 'single': return withOther(a);
        case 'multi': return a.map(withOther).join('\n');
        case 'rank': return a.map((i, k) => (k + 1) + ') ' + withOther(i)).join('\n');
        case 'number': return String(a).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' руб. в месяц';
        case 'slider': return a + ' из 100 (0 — самые бедные, 100 — самые богатые)';
        case 'matrix': return q.rows.map((r, i) => r + ': ' + a[i]).join('\n');
    }
    return '';
}

// ---------- расчёт профиля ----------
function calcEconProfile(E) {
    if (!econCompleteFor(E)) return null;
    const dims = [ecMoney(E), ecWealth(E), ecStatus(E), ecPeople(E), ecRisk(E), ecEnterprise(E), ecValues(E), ecCareer(E)];
    const byKey = {}; dims.forEach(d => { byKey[d.key] = d; });
    const bars = [
        { label: 'Значимость денег', value: ecMean([ecN(E, 'q2'), ecN(E, 'q41')]) },
        { label: 'Готовность к риску', value: ecN(E, 'q15') },
        { label: 'Предприимчивость', value: byKey.enterprise.P },
        { label: 'Субъективный достаток', value: byKey.status.S },
        { label: 'Интерес к экономике', value: ecMean([ecN(E, 'q20'), ecN(E, 'q21')]) },
        { label: 'Расположенность к богатым', value: ecN(E, 'q30') },
        { label: 'Расположенность к бедным', value: ecN(E, 'q38') }
    ].map(b => ({ label: b.label, value: Math.round(b.value * 100) }));
    const rows = ECON_QS.filter(q => econVisible(q)).map(q => ({ n: econLabel(q).trim() || '10б.', q: q.text, a: ecAnswerText(q, E) }));
    return { dims: dims.map(d => { delete d.P; delete d.S; return d; }), bars: bars, rows: rows };
}

// ---------- экран результатов ----------
function renderEconResult(container) {
    const res = calcEconProfile(state.econ);
    if (!res) return false;
    let h = '<div class="econ-res-caption">Положение Ваших ответов на шкалах: 0% — нижний край шкалы, 100% — верхний. Это не сравнение с другими людьми.</div>';
    h += '<div class="econ-res-bars">' + res.bars.map(b =>
        '<div class="econ-bar-row"><span class="econ-bar-label">' + b.label + '</span><div class="econ-bar-track"><div class="econ-bar-fill" style="width:' + Math.max(2, b.value) + '%"></div></div><span class="econ-bar-val">' + b.value + '%</span></div>').join('') + '</div>';
    h += '<button class="btn btn-secondary toggle-details" data-target="detailsEcon" onclick="toggleDetails(\'detailsEcon\')">Подробнее ' +
         '<span class="detail-arrow"><svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">' +
         '<path d="M1 7 L6 1 L11 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span></button>' +
         '<div id="detailsEcon" style="display:none; margin-top:15px;">' +
         '<div class="econ-res-title">Экономический профиль</div>' +
         '<p class="econ-res-intro">Ваш профиль по ' + res.dims.length + ' параметрам. У каждого параметра есть несколько возможных типов; ниже указан тот, который соответствует именно Вашим ответам.</p>' +
         '<div class="econ-res-grid">' + res.dims.map(d =>
            '<div class="econ-res-card">' +
            '<div class="econ-res-param"><span class="econ-lab">Параметр:</span> ' + d.emoji + ' ' + d.topic + '</div>' +
            '<div class="econ-res-type"><span class="econ-lab">Тип:</span> ' + d.type.name + '</div>' +
            '<div class="econ-res-text"><span class="econ-lab">Описание:</span> ' + d.text + '</div>' +
            '<div class="econ-res-facts">' + d.facts.map(f => '<div>' + f + '</div>').join('') + '</div></div>').join('') +
         '</div></div>';
    container.innerHTML = h;
    return res;
}

// ---------- раздел PDF ----------
function econPdfSection(res) {
    const bar = b => ({ columns: [
        { text: b.label, width: 150, fontSize: 9 },
        { canvas: [{ type: 'rect', x: 0, y: 2, w: 200, h: 8, color: '#e5e8eb' }, { type: 'rect', x: 0, y: 2, w: Math.max(2, 2 * b.value), h: 8, color: '#3498db' }], width: 210 },
        { text: b.value + '%', fontSize: 9 }], margin: [0, 2, 0, 2] });
    const body = [[{ text: 'Параметр', bold: true }, { text: 'Тип', bold: true }, { text: 'Описание', bold: true }]];
    res.dims.forEach(d => body.push([{ text: d.topic, fontSize: 10 }, { text: d.type.name, bold: true }, { stack: [{ text: d.text, fontSize: 9 }].concat(d.facts.map(f => ({ text: f, fontSize: 8, color: '#666666', margin: [0, 2, 0, 0] }))) }]));
    const out = [
        { text: 'Положение Ваших ответов на шкалах (0% — нижний край шкалы, 100% — верхний; это не сравнение с другими людьми):', bold: true, margin: [0, 0, 0, 4] }
    ].concat(res.bars.map(bar), [
        { text: 'Таблица 1. Экономический профиль:', bold: true, margin: [0, 10, 0, 3] },
        { text: 'У каждого параметра есть несколько возможных типов; указан тот, который соответствует Вашим ответам.', style: 'small', margin: [0, 0, 0, 5] },
        { table: { headerRows: 1, dontBreakRows: true, widths: [105, 105, '*'], body: body }, layout: 'lightHorizontalLines' }
    ]);
    const raw = [[{ text: '№', style: 'th', fontSize: 8 }, { text: 'Вопрос', style: 'th', fontSize: 8 }, { text: 'Ответ респондента', style: 'th', fontSize: 8 }]];
    res.rows.forEach(r => raw.push([{ text: r.n, fontSize: 8, alignment: 'center' }, { text: r.q, fontSize: 8 }, { text: r.a, fontSize: 8, bold: true }]));
    return out.concat([
        { text: 'Таблица 2. Ответы респондента:', bold: true, margin: [0, 0, 0, 5], pageBreak: 'before' },
        { table: { headerRows: 1, dontBreakRows: true, widths: [22, '*', 190], body: raw },
          layout: { paddingLeft: () => 3, paddingRight: () => 3, paddingTop: () => 2, paddingBottom: () => 2, hLineColor: () => '#cccccc', vLineColor: () => '#cccccc', hLineWidth: () => 0.5, vLineWidth: () => 0.5 } },
        // для психолога: как определены типы (в конце раздела, чтобы не мешать чтению)
        { text: 'Приложение. Как определяются типы', style: 'h3', margin: [0, 15, 0, 4] }
    ], ECON_RULES.map(r => ({ text: '• ' + r, fontSize: 9, color: '#555555', margin: [0, 0, 0, 3] })));
}

registerMethod({ id: 'econ', title: 'Экономическое сознание', render: renderEconResult, pdf: econPdfSection });
