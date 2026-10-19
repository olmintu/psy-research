// ======================================================================
// ЭКОНОМИЧЕСКОЕ САМООПРЕДЕЛЕНИЕ: экран опросника (вопросы описаны в js/econ_data.js)
//
// Формат ответов state.econ хранится «как есть», без подсчётов:
//   scale  - число на шкале                  q2: 5
//   single - номер варианта (с 0)            q7: 2          (+ q18_other: "текст", если выбрано «другое»)
//   multi  - номера вариантов (с 0)          q1: [0, 3, 12] (+ q1_other: "текст")
//   rank   - номера вариантов по порядку     q11: [5, 0, 7] (первый = ранг 1; + q29_other)
//   number - целое число                     q3: 150000
//   slider - число 0..100                    q34: 37
//   matrix - { номер строки: значение }      q31: { 0: 5, 1: 6, 2: 4 }
// state.econPage - номер текущего экрана (для восстановления после перезагрузки).
// Вопросы со showIf, которые не показываются, в ответах отсутствуют.
// ======================================================================

const econQ = {};
ECON_QS.forEach(q => { econQ[q.id] = q; });

function econE() { return state.econ || {}; }                                   // чтение (не меняет state)
function econAns() { if (!state.econ) state.econ = {}; return state.econ; }     // запись
function econPage() { return Math.max(0, Math.min(ECON_SCREENS.length - 1, parseInt(state.econPage, 10) || 0)); }
function econLabel(q) { return q.id === 'q10b' ? '' : q.id.slice(1).replace(/a$/, 'а').replace(/b$/, 'б') + '. '; }
function econLast(q) { return q.options ? q.options.length - 1 : -1; }

function econVisible(q) {
    if (!q.showIf) return true;
    const v = econE()[q.showIf.q];
    if (v === undefined) return false;
    if (q.showIf.in) return q.showIf.in.includes(v);
    if (q.showIf.notIn) return !q.showIf.notIn.includes(v);
    return true;
}
function econIsAnswered(q) {
    const a = econE()[q.id];
    switch (q.type) {
        case 'scale': case 'single': case 'slider': return a !== undefined && a !== null;
        case 'number': return Number.isInteger(a) && a >= q.min && a <= q.max;
        case 'multi': return Array.isArray(a) && a.length >= 1 && (!q.max || a.length <= q.max);
        case 'rank': return Array.isArray(a) && a.length === q.n;
        case 'matrix': return !!a && q.rows.every((_, i) => a[i] !== undefined);
    }
    return false;
}
function econVisibleQs() { return ECON_QS.filter(econVisible); }
function econVisibleCount() { return econVisibleQs().length; }
function econAnsweredCount() { return econVisibleQs().filter(econIsAnswered).length; }

// ---------------- разметка ----------------
function econScaleHTML(name, min, max, selected, handler) {
    let b = '';
    for (let v = min; v <= max; v++) {
        b += `<label class="econ-sc"><input type="radio" name="${name}" value="${v}" ${selected === v ? 'checked' : ''} onclick="${handler(v)}"><span>${v}</span></label>`;
    }
    return `<div class="econ-scale">${b}</div>`;
}
function econAnchorsHTML(anchors, extra) {
    return `<div class="econ-anchors ${extra || ''}">` + anchors.map(a => `<span>${a}</span>`).join('') + '</div>';
}
function econOtherHTML(q) {
    return q.other ? `<input type="text" class="econ-other" id="e_${q.id}_other" maxlength="200" placeholder="Напишите свой вариант (не обязательно)" style="display:none" oninput="econOther('${q.id}', this.value)">` : '';
}
function econQuestionHTML(q) {
    const A = econE()[q.id];
    const num = econLabel(q);
    let h = `<div class="econ-text">${num ? '<b>' + num + '</b>' : ''}${q.text}</div>`;
    if (q.hint) h += `<div class="econ-hint">${q.hint}</div>`;
    switch (q.type) {
        case 'scale':
            h += econScaleHTML('e_' + q.id, q.min, q.max, A, v => `econSet('${q.id}',${v})`) + econAnchorsHTML(q.anchors);
            break;
        case 'single':
            h += '<div class="econ-opts">' + q.options.map((o, i) =>
                `<label class="econ-opt"><input type="radio" name="e_${q.id}" value="${i}" ${A === i ? 'checked' : ''} onclick="econSingle('${q.id}',${i})"><span>${o}</span></label>`).join('') + '</div>' + econOtherHTML(q);
            break;
        case 'multi':
            h += '<div class="econ-opts">' + q.options.map((o, i) =>
                `<label class="econ-opt"><input type="checkbox" name="e_${q.id}" value="${i}" ${Array.isArray(A) && A.includes(i) ? 'checked' : ''} onclick="econMulti('${q.id}',${i},this)"><span>${o}</span></label>`).join('') + '</div>' + econOtherHTML(q);
            break;
        case 'rank':
            h += `<div class="econ-rank-count" id="e_${q.id}_cnt"></div><div class="econ-rank">` + q.options.map((o, i) =>
                `<div class="econ-rank-opt" id="e_${q.id}_${i}" onclick="econRank('${q.id}',${i})"><span class="econ-rank-badge"></span><span>${o}</span></div>`).join('') + '</div>' + econOtherHTML(q);
            break;
        case 'number':
            h += `<div class="econ-number-wrap"><input type="number" class="econ-number" id="e_${q.id}" inputmode="numeric" min="${q.min}" max="${q.max}" step="1" value="${Number.isInteger(A) ? A : ''}" oninput="econNumber('${q.id}', this.value)"><span>${q.unit || ''}</span></div>`;
            break;
        case 'slider':
            h += `<div class="econ-slider-wrap"><span>${q.left}</span><input type="range" class="econ-slider ${A === undefined ? 'untouched' : ''}" id="e_${q.id}" min="0" max="100" step="1" value="${A !== undefined ? A : 50}" oninput="econSlider('${q.id}', this.value)" onchange="econSlider('${q.id}', this.value)" onpointerup="econSlider('${q.id}', this.value)"><span>${q.right}</span></div>` +
                `<div class="econ-slider-val" id="e_${q.id}_val">${A !== undefined ? 'Положение отмечено' : 'Передвиньте ползунок, чтобы отметить положение'}</div>`;
            break;
        case 'matrix':
            h += econAnchorsHTML(q.anchors, 'econ-anchors-top') + q.rows.map((r, i) =>
                `<div class="econ-mrow"><div class="econ-mtext">${r}</div>` +
                econScaleHTML(`e_${q.id}_${i}`, q.min, q.max, A ? A[i] : undefined, v => `econMatrix('${q.id}',${i},${v})`) + '</div>').join('');
            break;
    }
    return h + `<div class="econ-note" id="e_${q.id}_note"></div>`;
}

// «Другое»: показать поле ввода, если выбран последний вариант, и подставить сохранённый текст
function econOtherSync(q) {
    if (!q.other) return;
    const inp = document.getElementById('e_' + q.id + '_other');
    if (!inp) return;
    const a = econE()[q.id];
    const last = econLast(q);
    const picked = q.type === 'single' ? a === last : (Array.isArray(a) && a.includes(last));
    inp.style.display = picked ? 'block' : 'none';
    if (picked) { if (inp.value === '') inp.value = econE()[q.id + '_other'] || ''; }
    else { inp.value = ''; delete econAns()[q.id + '_other']; }
}
function econRankPaint(q) {
    const arr = econE()[q.id] || [];
    q.options.forEach((_, i) => {
        const el = document.getElementById('e_' + q.id + '_' + i);
        if (!el) return;
        const r = arr.indexOf(i);
        el.classList.toggle('selected', r >= 0);
        el.querySelector('.econ-rank-badge').textContent = r >= 0 ? String(r + 1) : '';
    });
    const c = document.getElementById('e_' + q.id + '_cnt');
    if (c) c.textContent = 'Выбрано: ' + arr.length + ' из ' + q.n;
    econOtherSync(q);
}
function econPaint(q) { if (q.type === 'rank') econRankPaint(q); else econOtherSync(q); }

// ---------------- экран ----------------
function renderEcon() {
    const page = econPage();
    state.econPage = page;
    const ids = ECON_SCREENS[page];
    let h = `<div class="econ-part">Часть ${page + 1} из ${ECON_SCREENS.length}</div>`;
    ids.forEach(id => {
        const q = econQ[id];
        h += `<div class="econ-q" id="econq_${id}" style="display:${econVisible(q) ? 'block' : 'none'}">${econQuestionHTML(q)}</div>`;
    });
    document.getElementById('econ-container').innerHTML = h;
    ids.forEach(id => econPaint(econQ[id]));
    document.getElementById('econ-error').style.display = 'none';
    econUpdateSticky();
}
function econPageComplete(page) { return ECON_SCREENS[page].every(id => !econVisible(econQ[id]) || econIsAnswered(econQ[id])); }
function econUpdateSticky() {
    const bc = document.querySelector('#step-econ .btn-container');
    if (bc) bc.classList.toggle('smart-sticky', econPageComplete(econPage()));
}
function econNote(qid, text) { const n = document.getElementById('e_' + qid + '_note'); if (n) n.textContent = text; }
function econClearError(qid) {
    const box = document.getElementById('econq_' + qid);
    if (box) box.classList.remove('highlight-error');
    if (!document.querySelector('#econ-container .highlight-error')) document.getElementById('econ-error').style.display = 'none';
}
// Показать/скрыть зависимые вопросы текущего экрана; ответ скрытого вопроса забывается
function econApplyVisibility() {
    ECON_QS.filter(q => q.showIf).forEach(q => {
        const box = document.getElementById('econq_' + q.id);
        if (!box) return;
        const vis = econVisible(q);
        const was = box.style.display !== 'none';
        box.style.display = vis ? 'block' : 'none';
        if (!vis && was) {
            const E = econAns();
            delete E[q.id]; delete E[q.id + '_other'];
            box.classList.remove('highlight-error');
            box.innerHTML = econQuestionHTML(q);
            econPaint(q);
        }
    });
}
function econAfterChange(qid) {
    econClearError(qid);
    econApplyVisibility();
    econUpdateSticky();
    saveStateToLocal();
}

// ---------------- обработчики ответов ----------------
function econSet(qid, v) { econAns()[qid] = v; econAfterChange(qid); }
function econSingle(qid, i) { econAns()[qid] = i; econOtherSync(econQ[qid]); econAfterChange(qid); }
function econMulti(qid, i, el) {
    const q = econQ[qid], E = econAns();
    let arr = Array.isArray(E[qid]) ? E[qid].slice() : [];
    if (el.checked) {
        if (q.max && arr.length >= q.max) {
            el.checked = false;
            econNote(qid, 'Можно выбрать не более ' + q.max + ' вариантов. Снимите отметку с одного из выбранных.');
            return;
        }
        arr.push(i);
    } else {
        arr = arr.filter(x => x !== i);
    }
    if (arr.length) E[qid] = arr; else delete E[qid];
    econNote(qid, '');
    econOtherSync(q);
    econAfterChange(qid);
}
function econRank(qid, i) {
    const q = econQ[qid], E = econAns();
    let arr = Array.isArray(E[qid]) ? E[qid].slice() : [];
    const pos = arr.indexOf(i);
    if (pos >= 0) { arr.splice(pos, 1); econNote(qid, ''); }
    else if (arr.length >= q.n) { econNote(qid, 'Уже выбрано ' + q.n + '. Чтобы выбрать другой вариант, сначала отмените один из выбранных.'); return; }
    else { arr.push(i); econNote(qid, ''); }
    if (arr.length) E[qid] = arr; else delete E[qid];
    econRankPaint(q);
    econAfterChange(qid);
}
function econOther(qid, text) { econAns()[qid + '_other'] = text; saveStateToLocal(); }
function econNumber(qid, raw) {
    const q = econQ[qid], E = econAns();
    const n = raw === '' ? NaN : Number(raw);
    if (Number.isInteger(n) && n >= q.min && n <= q.max) { E[qid] = n; econAfterChange(qid); }
    else { delete E[qid]; econUpdateSticky(); saveStateToLocal(); }
}
function econSlider(qid, raw) {
    econAns()[qid] = Number(raw);
    const el = document.getElementById('e_' + qid);
    if (el) el.classList.remove('untouched');
    const lab = document.getElementById('e_' + qid + '_val');
    if (lab) lab.textContent = 'Положение отмечено';
    econAfterChange(qid);
}
function econMatrix(qid, row, v) {
    const E = econAns();
    if (!E[qid]) E[qid] = {};
    E[qid][row] = v;
    if (econIsAnswered(econQ[qid])) econClearError(qid);
    econUpdateSticky();
    saveStateToLocal();
}

// ---------------- проверка и переходы ----------------
function econCleanup() {   // ответы скрытых вопросов не храним
    const E = econAns();
    ECON_QS.forEach(q => { if (!econVisible(q)) { delete E[q.id]; delete E[q.id + '_other']; } });
}
function econValidatePage(page) {
    let first = null;
    ECON_SCREENS[page].forEach(id => {
        const q = econQ[id];
        if (!econVisible(q) || econIsAnswered(q)) return;
        const box = document.getElementById('econq_' + id);
        if (box) { box.classList.add('highlight-error'); if (!first) first = box; }
    });
    const err = document.getElementById('econ-error');
    if (first) { err.style.display = 'block'; first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    err.style.display = 'none';
    return true;
}
function finishEcon() {
    const page = econPage();
    if (!econValidatePage(page)) return;
    econCleanup();
    if (page < ECON_SCREENS.length - 1) {
        state.econPage = page + 1;
        saveStateToLocal();
        renderEcon();
        window.scrollTo(0, 0);
        return;
    }
    checkFast('econ', 120, 'FAST_ECON');   // 48 вопросов быстрее 2 минут
    goNext('econ');
}
function prevEcon() {
    const page = econPage();
    if (page > 0) {
        state.econPage = page - 1;
        saveStateToLocal();
        renderEcon();
        window.scrollTo(0, 0);
        return;
    }
    goPrev('econ');
}

// ---------------- случайные ответы (режим разработчика и тесты) ----------------
function econRandomAnswer(q, E) {
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pick = (len, k) => { const idx = Array.from({ length: len }, (_, i) => i).sort(() => Math.random() - 0.5); return idx.slice(0, k); };
    switch (q.type) {
        case 'scale': E[q.id] = ri(q.min, q.max); break;
        case 'single': E[q.id] = ri(0, q.options.length - 1); break;
        case 'multi': E[q.id] = pick(q.options.length, ri(1, q.max || 3)); break;
        case 'rank': E[q.id] = pick(q.options.length, q.n); break;
        case 'number': E[q.id] = ri(0, 200) * 1000; break;
        case 'slider': E[q.id] = ri(0, 100); break;
        case 'matrix': E[q.id] = {}; q.rows.forEach((_, i) => { E[q.id][i] = ri(q.min, q.max); }); break;
    }
}
function makeRandomEcon(ids) {
    const E = {};
    const real = state.econ;
    state.econ = E;                              // чтобы showIf видел уже выданные ответы
    try {
        (ids || ECON_QS.map(q => q.id)).forEach(id => { const q = econQ[id]; if (econVisible(q)) econRandomAnswer(q, E); });
    } finally { state.econ = real; }
    return E;
}
function devFillEconPage() {
    const E = econAns();
    ECON_SCREENS[econPage()].forEach(id => {
        const q = econQ[id];
        if (econVisible(q)) econRandomAnswer(q, E);
    });
    econCleanup();
    saveStateToLocal();
    renderEcon();
}
