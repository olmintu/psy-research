// ======================================================================
// ТЕСТ СМЫСЛОЖИЗНЕННЫХ ОРИЕНТАЦИЙ (СЖО), Д.А. Леонтьев
// Подсчёт баллов (calcSJO) не зависит от интерфейса: те же правила использует обработчик данных.
// Ответы хранятся «как есть»: state.sjo[i] = позиция 1..7 слева направо (на экране 3 2 1 0 1 2 3),
// i = 0..19 (номер пункта минус 1).
// ======================================================================

// Пункты, где балл равен позиции (восходящая шкала 1..7). В остальных (нисходящая шкала 7..1) балл = 8 - позиция.
const SJO_ASC = [1, 3, 4, 8, 9, 11, 12, 16, 17];

// Шкалы: номера пунктов (1..20) и нормы (среднее, стандартное отклонение; N=200) отдельно для мужчин (m) и женщин (f)
const SJO_SCALES = [
    { key: 'goals',     title: 'Цели в жизни',          items: [3, 4, 10, 16, 17, 18], norm: { m: [32.90, 5.92],   f: [29.38, 6.24] } },
    { key: 'process',   title: 'Процесс жизни',         items: [1, 2, 4, 5, 7, 9],     norm: { m: [31.09, 4.44],   f: [28.80, 6.14] } },
    { key: 'result',    title: 'Результативность жизни', items: [8, 9, 10, 12, 20],     norm: { m: [25.46, 4.30],   f: [23.30, 4.95] } },
    { key: 'locusSelf', title: 'Локус контроля-Я',      items: [1, 15, 16, 19],        norm: { m: [21.13, 3.85],   f: [18.58, 4.30] } },
    { key: 'locusLife', title: 'Локус контроля-жизнь',  items: [7, 10, 11, 14, 18, 19], norm: { m: [30.14, 5.80],   f: [28.70, 6.10] } },
    { key: 'total',     title: 'Общий показатель ОЖ',   items: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], norm: { m: [103.10, 15.03], f: [95.76, 16.54] } }
];

const SJO_LEVELS = { low: 'Ниже нормы', mid: 'В пределах нормы', high: 'Выше нормы' };

// Описания шкал (из описания методики)
const SJO_DESC = {
    goals: ['Цели в жизни', 'Баллы по этой шкале характеризуют наличие или отсутствие в жизни испытуемого целей в будущем, которые придают жизни осмысленность, направленность и временную перспективу. Низкие баллы по этой шкале даже при общем высоком уровне ОЖ будут присущи человеку, живущему сегодняшним или вчерашним днем. Вместе с тем высокие баллы по этой шкале могут характеризовать не только целеустремленного человека, но и прожектёра, планы которого не имеют реальной опоры в настоящем и не подкрепляются личной ответственностью за их реализацию. Эти два случая несложно различить, учитывая показатели по другим шкалам СЖО.'],
    process: ['Процесс жизни, или интерес и эмоциональная насыщенность жизни', 'Содержание этой шкалы совпадает с известной теорией о том, что единственный смысл жизни состоит в том, чтобы жить. Этот показатель говорит о том, воспринимает ли испытуемый сам процесс своей жизни как интересный, эмоционально насыщенный и наполненный смыслом. Высокие баллы по этой шкале и низкие по остальным будут характеризовать гедониста, живущего сегодняшним днем. Низкие баллы по этой шкале — признак неудовлетворенности своей жизнью в настоящем; при этом, однако, ей могут придавать полноценный смысл воспоминания о прошлом или нацеленность в будущее.'],
    result: ['Результативность жизни, или удовлетворенность самореализацией', 'Баллы по этой шкале отражают оценку пройденного отрезка жизни, ощущение того, насколько продуктивна и осмысленна была прожитая ее часть. Высокие баллы по этой шкале и низкие по остальным будут характеризовать человека, у которого, по ощущениям, все в прошлом, но также это прошлое способно придать смысл жизни. Низкие баллы — неудовлетворенность прожитой частью жизни.'],
    locusSelf: ['Локус контроля-Я (Я — хозяин жизни)', 'Высокие баллы соответствуют представлению о себе как о сильной личности, обладающей достаточной свободой выбора, чтобы построить свою жизнь в соответствии со своими целями и представлениями о ее смысле. Низкие баллы — неверие в свои силы контролировать события собственной жизни.'],
    locusLife: ['Локус контроля-жизнь, или управляемость жизни', 'При высоких баллах — убеждение в том, что человеку дано контролировать свою жизнь, свободно принимать решения и воплощать их в жизнь. Низкие баллы — фатализм, убежденность в том, что жизнь человека неподвластна сознательному контролю, что свобода выбора иллюзорна и бессмысленно что-либо загадывать на будущее.'],
    total: ['Общий показатель осмысленности жизни (ОЖ)', 'Суммарная оценка по всем 20 пунктам теста.']
};

function sjoItemScore(n, pos) { return SJO_ASC.includes(n) ? pos : 8 - pos; }   // n - номер пункта 1..20
function sjoNormKey(gender) { return gender === 'Мужской' ? 'm' : gender === 'Женский' ? 'f' : null; }

// Возвращает { norm: 'm'|'f'|null, scales: [{key,title,score,min,max,z,level}] } или null, если ответы неполные.
// Уровень: z <= -1 - ниже нормы, z >= 1 - выше нормы, иначе в пределах нормы (граница ±1σ).
function calcSJO(answers, gender) {
    if (!answers) return null;
    const items = [];                              // сырые ответы и баллы по пунктам (для PDF)
    for (let i = 0; i < 20; i++) {
        const p = Number(answers[i]);
        if (!(p >= 1 && p <= 7)) return null;
        items.push({ n: i + 1, pos: p, score: sjoItemScore(i + 1, p) });
    }
    const nk = sjoNormKey(gender);
    const scales = SJO_SCALES.map(s => {
        const score = s.items.reduce((sum, n) => sum + sjoItemScore(n, Number(answers[n - 1])), 0);
        const out = { key: s.key, title: s.title, score: score, min: s.items.length, max: s.items.length * 7, z: null, level: null };
        if (nk) {
            const M = s.norm[nk][0], SD = s.norm[nk][1];
            out.z = (score - M) / SD;
            out.level = out.z <= -1 ? 'low' : (out.z >= 1 ? 'high' : 'mid');
        }
        return out;
    });
    return { norm: nk, scales: scales, items: items };
}

function sjoFmtZ(z) { return (z >= 0 ? '+' : '−') + Math.abs(z).toFixed(2).replace('.', ','); }
function sjoNormNote(res) {
    if (!res.norm) return 'Нормы теста заданы отдельно для мужчин и женщин, поэтому без указания пола показаны только баллы.';
    return 'Сравнение с нормативной выборкой (' + (res.norm === 'm' ? 'мужчины' : 'женщины') + ', N=200). Серая полоса: диапазон нормы (±1σ), точка: Ваш результат.';
}

// ---------- вывод на экран результатов ----------
function renderSJOResult(container) {
    const res = calcSJO(state.sjo, state.meta && state.meta.gender);
    if (!res) return false;                       // нет данных (например, загружен старый файл без СЖО)
    let h = '<p style="font-size:0.9em; color:var(--text-muted); margin-top:0;">' + sjoNormNote(res) + '</p>';
    res.scales.forEach(s => {
        h += '<div class="sjo-res-row"><div class="sjo-res-head"><span class="sjo-res-title">' + s.title + '</span>' +
             '<span class="sjo-res-score">' + s.score + ' <small>из ' + s.max + '</small></span></div>';
        if (res.norm) {
            const pct = Math.max(2, Math.min(98, (s.z + 2.5) / 5 * 100));
            h += '<div class="sjo-track"><div class="sjo-band"></div><div class="sjo-dot sjo-' + s.level + '" style="left:' + pct.toFixed(1) + '%"></div></div>' +
                 '<div class="sjo-track-labels"><span>ниже</span><span>норма</span><span>выше</span></div>' +
                 '<div class="sjo-res-foot"><span class="sjo-badge sjo-b-' + s.level + '">' + SJO_LEVELS[s.level] + '</span><span>z = ' + sjoFmtZ(s.z) + '</span></div>';
        }
        h += '</div>';
    });
    h += '<button class="btn btn-secondary toggle-details" data-target="detailsSJO" onclick="toggleDetails(\'detailsSJO\')">Подробнее ' +
         '<span class="detail-arrow"><svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">' +
         '<path d="M1 7 L6 1 L11 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span></button>' +
         '<div id="detailsSJO" style="display:none; margin-top:15px; font-size:0.9em; line-height:1.6;">';
    res.scales.forEach(s => { const d = SJO_DESC[s.key]; h += '<p><b>' + d[0] + '.</b> ' + d[1] + '</p>'; });
    h += '</div>';
    container.innerHTML = h;
    return res;                                   // уйдёт в EXTRA_REPORT и в PDF
}

// ---------- секция PDF ----------
// Таблица сырых ответов: выбранная отметка подсвечена, «Балл» - значение пункта по ключу теста (1..7)
function sjoRawTable(res) {
    const th = t => ({ text: t, style: 'th', fontSize: 8 });
    const body = [[th('№'), th('Левое утверждение'), { text: 'Отметка', style: 'th', fontSize: 8, colSpan: 7 }, {}, {}, {}, {}, {}, {}, th('Правое утверждение'), th('Балл')]];
    const labels = [3, 2, 1, 0, 1, 2, 3];
    res.items.forEach(it => {
        const row = [{ text: String(it.n), fontSize: 8, alignment: 'center' }, { text: sjo_qs[it.n - 1][0], fontSize: 8 }];
        labels.forEach((lab, idx) => {
            row.push((idx + 1) === it.pos
                ? { text: String(lab), bold: true, fontSize: 9, alignment: 'center', fillColor: '#aed6f1' }
                : { text: String(lab), fontSize: 8, color: '#aaaaaa', alignment: 'center' });
        });
        row.push({ text: sjo_qs[it.n - 1][1], fontSize: 8 }, { text: String(it.score), bold: true, fontSize: 9, alignment: 'center' });
        body.push(row);
    });
    return [
        { text: 'Таблица 2. Ответы респондента (выбранная отметка выделена; «Балл» - значение пункта по ключу теста, 1-7):', bold: true, margin: [0, 0, 0, 5], pageBreak: 'before' },
        {
            table: { headerRows: 1, dontBreakRows: true, widths: [14, '*', 13, 13, 13, 13, 13, 13, 13, '*', 24], body: body },
            layout: { paddingLeft: () => 3, paddingRight: () => 3, paddingTop: () => 2, paddingBottom: () => 2, hLineColor: () => '#cccccc', vLineColor: () => '#cccccc', hLineWidth: () => 0.5, vLineWidth: () => 0.5 }
        }
    ];
}

function sjoPdfSection(res) {
    const body = [[{ text: 'Шкала', bold: true }, { text: 'Баллы', bold: true }, { text: 'Диапазон', bold: true }, { text: 'z', bold: true }, { text: 'Уровень', bold: true }]];
    res.scales.forEach(s => body.push([s.title, String(s.score), s.min + '–' + s.max, s.z === null ? '—' : sjoFmtZ(s.z), s.level ? SJO_LEVELS[s.level] : '—']));
    const out = [
        { text: sjoNormNote(res), style: 'small', margin: [0, 0, 0, 8] },
        { text: 'Таблица 1. Результаты СЖО:', bold: true, margin: [0, 0, 0, 5] },
        { table: { headerRows: 1, widths: ['*', 38, 62, 38, 118], body: body }, layout: 'lightHorizontalLines' },
        { text: 'Описание шкал', style: 'h3', margin: [0, 10, 0, 4] }
    ];
    res.scales.forEach(s => { const d = SJO_DESC[s.key]; out.push({ text: [{ text: d[0] + '. ', bold: true }, { text: d[1] }], style: 'small', margin: [0, 0, 0, 4] }); });
    return out.concat(sjoRawTable(res));
}
registerMethod({ id: 'sjo', title: 'Смысложизненные ориентации (тест Д.А. Леонтьева)', render: renderSJOResult, pdf: sjoPdfSection });