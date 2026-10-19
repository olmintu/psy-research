// ======================================================================
// РЕЕСТР МЕТОДИК: подключение новых методик к экрану результатов и к PDF
// ======================================================================
// Три исходные методики (Братусь, Мильман, ИПЛ) выводятся прежним кодом.
// Новые методики подключаются через registerMethod() и не требуют правки
// calculateAndShowResults и PDF-модуля: порядок на экране и в PDF берётся из FLOW.
//
//   registerMethod({
//     id: 'sjo',                                  // должен совпадать с id в FLOW
//     title: 'Смысложизненные ориентации',        // заголовок блока (номер добавится сам)
//     render(container) { ... },                  // СИНХРОННО нарисовать результат в container; вернуть данные для PDF
//                                                 // или false, если данных нет (блок тогда скрывается)
//     pdf(report) { ... }                         // вернуть массив элементов pdfmake (можно async)
//   });

const LEGACY_BLOCKS = ['bratus', 'milman', 'ipl'];
const METHODS = {};
window.EXTRA_REPORT = {};   // данные новых методик для PDF (заполняется при показе результатов)

function registerMethod(m) { METHODS[m.id] = m; }

// Номер блока на экране результатов и в PDF, например "2. ". Считаются только блоки с результатом:
// исходные три всегда, новые - если их render вернул данные (иначе в нумерации не будет «дыр»).
function blockNum(id) {
    const shown = FLOW.filter(x => LEGACY_BLOCKS.includes(x) || (x in window.EXTRA_REPORT));
    const i = shown.indexOf(id);
    return i >= 0 ? (i + 1) + '. ' : '';
}

// После какого из исходных блоков стоит новый ('start', если новый идёт перед всеми исходными)
function anchorFor(id) {
    for (let i = FLOW.indexOf(id) - 1; i >= 0; i--) if (LEGACY_BLOCKS.includes(FLOW[i])) return FLOW[i];
    return 'start';
}

// Выводит результаты новых методик на экран (вызывается в конце calculateAndShowResults)
function runResultHooks() {
    window.EXTRA_REPORT = {};
    document.querySelectorAll('.res-block-extra').forEach(e => e.remove()); // при повторном показе не дублировать
    const tail = {};
    FLOW.forEach(id => {
        const m = METHODS[id];
        if (!m) return;
        const anchor = anchorFor(id);
        const first = document.getElementById('res-bratus');
        const card = document.createElement('div');
        card.className = 'res-block res-block-extra';
        card.id = 'res-' + id;
        card.innerHTML = '<h3><span class="res-num" data-block="' + id + '"></span>' + m.title + '</h3><div class="res-body"></div>';
        if (anchor === 'start') {
            first.parentNode.insertBefore(card, first);
        } else {
            const ref = tail[anchor] || document.getElementById('res-' + anchor);
            ref.parentNode.insertBefore(card, ref.nextSibling);
        }
        let report;
        try { report = m.render(card.querySelector('.res-body')); }
        catch (e) { console.error('Ошибка вывода методики ' + id, e); report = false; }
        if (report === false || report === undefined || report === null) { card.remove(); return; }
        tail[anchor] = card;
        window.EXTRA_REPORT[id] = report;
    });
    // Номера в заголовках блоков на экране результатов
    document.querySelectorAll('.res-num').forEach(n => { n.textContent = blockNum(n.dataset.block); });
}

// Секции PDF для новых методик. anchor: 'start' | 'bratus' | 'milman' | 'ipl'
async function pdfExtra(anchor, breakBefore) {
    let out = [];
    for (const id of FLOW) {
        const m = METHODS[id];
        if (!m || !m.pdf || !(id in window.EXTRA_REPORT) || anchorFor(id) !== anchor) continue;
        const body = await m.pdf(window.EXTRA_REPORT[id]);
        const part = [{ text: blockNum(id) + m.title, style: 'h2' }].concat(body);
        out = out.concat(breakBefore ? [{ text: '', pageBreak: 'after' }] : [], part, breakBefore ? [] : [{ text: '', pageBreak: 'after' }]);
    }
    return out;
}