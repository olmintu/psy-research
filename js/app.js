// --- ИНИЦИАЛИЗАЦИЯ ТЕМЫ ---
function initTheme() {
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // Если в ОС стоит темная тема, ставим ее по умолчанию
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}
initTheme(); // Вызываем сразу, чтобы не было "белой вспышки" при загрузке
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app_theme', newTheme);
    // Определяем цвета для осей и текста графиков в зависимости от темы
    const textColor = newTheme === 'dark' ? '#f4f6f8' : '#333333';
    const gridColor = newTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    // Перерисовываем графики , если они открыты, чтобы обновить цвет текста
    // Перебираем все существующие инстансы Chart.js на странице и обновляем их
    for (let id in Chart.instances) {
        let chart = Chart.instances[id];
        // Обновляем цвет текста легенды
        if (chart.options.plugins && chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }
        // Обновляем цвета осей X и Y
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = textColor;
                if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
            }
            if (chart.options.scales.y) {
                if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = textColor;
                if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
            }
        }
        // Принудительно перерисовываем график с новыми настройками
        chart.update();
    }
}
function showSoftAskModal() {
document.getElementById('soft-ask-modal').style.display = 'flex';
}
function closeSoftAskAndFill() {
// Пользователь согласился дозаполнить. Закрываем окно и подсвечиваем поля.
document.getElementById('soft-ask-modal').style.display = 'none';
document.getElementById('age').style.borderColor = "var(--warning)";
document.getElementById('gender').style.borderColor = "var(--warning)";
document.getElementById('gender').focus();
}
function proceedAsCompleteAnon() {
// Пользователь отказался наотрез. Закрываем окно и пускаем дальше.
document.getElementById('soft-ask-modal').style.display = 'none';

// Снимаем возможную подсветку
document.getElementById('age').style.borderColor = "#ddd";
document.getElementById('gender').style.borderColor = "#ddd";

saveStateToLocal();
goNext('form');
}
// Состояние
let state = { meta: {}, bratus: {}, rank: 1, econ: {}, econPage: 0, sjo: {}, milman: {}, ipl: {}, timing: {start: Date.now(), milman_start:0, ipl_start:0} };
let anonMode = false;

// --- ПОРЯДОК БЛОКОВ ---
// Порядок прохождения задаётся массивом FLOW в js/config.js. Чтобы поменять порядок или добавить блок,
// достаточно изменить FLOW и таблицу BLOCKS. Анкета ('form') всегда идёт первой.
const BLOCKS = {
    form:   { step: 'step-form' },
    econ:   { step: 'step-econ',   get total() { return econVisibleCount(); }, answered: () => econAnsweredCount(), enter: () => renderEcon() },
    bratus: { step: 'step-bratus', total: 8,   answered: () => Object.keys(state.bratus).length, enter: () => renderBratus() },
    sjo:    { step: 'step-sjo',    total: 20,  answered: () => Object.keys(state.sjo || {}).length, enter: () => renderSJO() },
    milman: { step: 'step-milman', total: 112, answered: () => Object.keys(state.milman).length, enter: () => renderMilman() },
    ipl:    { step: 'step-ipl',    total: 36,  answered: () => Object.keys(state.ipl).length,    enter: () => renderIPL() }
};
function blockOrder() { return ['form'].concat(FLOW); }
function goNext(cur) {
    const order = blockOrder();
    const next = order[order.indexOf(cur) + 1];
    if (!next) return;
    state.timing[next + '_start'] = Date.now(); // время входа в блок (для проверки быстрого прокликивания)
    state.step = next;
    switchStep(BLOCKS[cur].step, BLOCKS[next].step);
    if (BLOCKS[next].enter) BLOCKS[next].enter();
    saveStateToLocal();
}
function goPrev(cur) {
    const order = blockOrder();
    const prev = order[order.indexOf(cur) - 1];
    if (!prev) return;
    state.step = prev;
    switchStep(BLOCKS[cur].step, BLOCKS[prev].step);
    if (BLOCKS[prev].enter) BLOCKS[prev].enter();
    saveStateToLocal();
}
// Номера в заголовках блоков («1/3.», «2/3.» ...) подставляются автоматически по FLOW
function applyStepNumbers() {
    FLOW.forEach((id, i) => {
        if (!BLOCKS[id]) { console.error('FLOW содержит блок «' + id + '», которого нет в BLOCKS'); return; }
        const h2 = document.querySelector('#' + BLOCKS[id].step + ' h2');
        const n = h2 && h2.querySelector('.step-num');
        if (n) n.textContent = (i + 1) + '/' + FLOW.length + '. ';
    });
}
// Отмечает слишком быстрое прохождение блока: флаг попадает в meta.flags
function checkFast(blockId, minSeconds, flag) {
    const start = state.timing && state.timing[blockId + '_start'];
    if (start && (Date.now() - start) / 1000 < minSeconds) state.meta.flags = (state.meta.flags || "") + flag + ";";
}

// --- PERSISTENCE ---
function saveStateToLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateProgress(); }
function loadStateFromLocal() {
let saved = localStorage.getItem(STORAGE_KEY);
if (saved) Object.assign(state, JSON.parse(saved));
}
function clearState() { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }

// Запускаем инициализацию после загрузки страницы
window.addEventListener('DOMContentLoaded', initUserImporter);
window.addEventListener('DOMContentLoaded', applyStepNumbers);
// INIT
window.onload = function() {
if (localStorage.getItem(STORAGE_KEY)) {
    loadStateFromLocal();
        if (state.finished) {
        finishSurvey(true);
    } else if (FLOW.includes(state.step)) {
        switchStep('step-form', BLOCKS[state.step].step);
        if (BLOCKS[state.step].enter) BLOCKS[state.step].enter();
    } else if (state.meta.fio) {
        restoreForm();
    }
}
};
function restoreForm() {
if (state.meta.mode === 'anon' || state.meta.fio === "Аноним") {
    document.getElementById('anon_mode').checked = true;
    toggleAnon();
}
for(let k in state.meta) { let el = document.getElementById(k); if(el) el.value = state.meta[k]; }
toggleWorkPlace(); toggleEduBlock(); toggleKmnsName();
toggleOther('work_type'); toggleOther('work_sphere'); toggleOther('financial_support');
}
function updateProgress() {
let progressFill = document.getElementById('progress');
let progressBarContainer = document.querySelector('.progress-bar');
// 1. Считаем реальные ответы пользователя
let totalSteps = 0, currentSteps = 0;
FLOW.forEach(id => { if (!BLOCKS[id]) return; totalSteps += BLOCKS[id].total; currentSteps += BLOCKS[id].answered(); });
let pct = (currentSteps / totalSteps) * 100;
// На стартовом экране сбрасываем в 0
if (document.getElementById('step-form').classList.contains('active') || currentSteps === 0) {
    pct = 0;
} else if (pct < 2) {
    pct = 2; // Чтобы было видно начало на первом вопросе
}
// 2. Устанавливаем ширину
progressFill.style.width = pct + "%";
// 3. Красим в зеленый, если ответил на ВСЕ вопросы
if (pct >= 100) {
    progressFill.style.backgroundColor = "var(--success)"; // Зеленый
} else {
    progressFill.style.backgroundColor = "var(--primary)"; // Синий
}
// 4. Прячем бар на экране результатов
// Используем setTimeout, чтобы дождаться окончания анимации switchStep (200мс)
setTimeout(() => {
    if (document.getElementById('step-results').classList.contains('active')) {
        progressBarContainer.style.display = 'none';
    } else {
        progressBarContainer.style.display = 'block';
    }
}, 250);
checkSmartButtons();
}
function checkSmartButtons() {
// 1. Братусь (Ждем ровно 3 галочки)
let bratusBtn = document.querySelector('#step-bratus .btn-container');
if (bratusBtn) {
    let checkedCount = document.querySelectorAll('#bratus-options input:checked').length;
    if (checkedCount === 3) bratusBtn.classList.add('smart-sticky');
    else bratusBtn.classList.remove('smart-sticky');
}
// 2. Мильман (Ждем 112 ответов: 14 вопросов * 8 вариантов)
let milmanBtn = document.querySelector('#step-milman .btn-container');
if (milmanBtn) {
    if (Object.keys(state.milman).length === 112) milmanBtn.classList.add('smart-sticky');
    else milmanBtn.classList.remove('smart-sticky');
}
// 2.5. СЖО (Ждем 20 ответов)
let sjoBtn = document.querySelector('#step-sjo .btn-container');
if (sjoBtn) {
    if (Object.keys(state.sjo || {}).length === 20) sjoBtn.classList.add('smart-sticky');
    else sjoBtn.classList.remove('smart-sticky');
}
// 3. ИПЛ (Ждем 36 ответов)
let iplBtn = document.querySelector('#step-ipl .btn-container');
if (iplBtn) {
    if (Object.keys(state.ipl).length === 36) iplBtn.classList.add('smart-sticky');
    else iplBtn.classList.remove('smart-sticky');
}
}
// --- GOD MODE (DEV) ---
function checkDevMode(val) {
if(val.toLowerCase().trim() === 'dev') {
    document.getElementById('dev-panel').style.display = 'block';
}
}
function fillRandomData() {
state.meta = { fio: "Тестовый Юзер", gender: "Мужской", age: "25", family_status: "Холост/Не замужем", children: "Нет", is_working: "Да", work_type: "На частном предприятии", work_sphere: "IT и связь", financial_support: "Живу самостоятельно без поддержки родителей", has_secondary_edu: "Нет", edu_status: "Учусь", university: "СурГУ", speciality: "Психология", edu_level: "Бакалавриат", edu_basis: "Бюджет", course: "4", mode: "dev" };

let ids = Array.from({length:24}, (_, i) => i + 1);
for(let r=1; r<=8; r++) {
    state.bratus[r] = [];
    for(let k=0; k<3; k++) {
        let randIdx = Math.floor(Math.random() * ids.length);
        state.bratus[r].push(ids[randIdx]);
        ids.splice(randIdx, 1);
    }
}
state.rank = 8;
for(let q=0; q<14; q++) for(let i=0; i<8; i++) state.milman[`${q}_${i}`] = Math.floor(Math.random() * 4);
for(let i=0; i<36; i++) state.ipl[i] = Math.floor(Math.random() * 5) + 1;
for(let i=0; i<20; i++) state.sjo[i] = Math.floor(Math.random() * 7) + 1;
state.econ = makeRandomEcon(); state.econPage = ECON_SCREENS.length - 1;

saveStateToLocal();
finishSurvey();
}
// --- ЛОГИКА ---
function toggleConsent() {
// Снимаем красную подсветку, как только пользователь дал согласие
if (document.getElementById('consent_check').checked) {
    document.getElementById('consent_block').classList.remove('consent-error-state');
    document.getElementById('consent-error').style.display = 'none';
}
}
function toggleAnon() {
anonMode = document.getElementById('anon_mode').checked;
state.meta.mode = anonMode ? 'anon' : 'normal';
document.getElementById('anon_warning').style.display = anonMode ? 'block' : 'none';
document.querySelectorAll('.req').forEach(el => el.style.display = anonMode ? 'none' : 'inline');
const inputs = document.querySelectorAll('#step-form input:not(#anon_mode):not(#consent_check), #step-form select');
inputs.forEach(el => el.style.backgroundColor = anonMode ? 'var(--bg)' : 'var(--input-bg)');
saveStateToLocal();
}
function toggleWorkPlace() { document.getElementById('work_type_block').style.display = (document.getElementById('is_working').value === "Да") ? 'block' : 'none'; }
// Показывает поле «Уточните» под списком, если выбран вариант «Другое»
function toggleOther(id) {
    const block = document.getElementById(id + '_other_block');
    const show = document.getElementById(id).value === 'Другое';
    block.style.display = show ? 'block' : 'none';
    if (!show) document.getElementById(id + '_other').value = '';
}
// Необязательные и условные поля анкеты: сохраняем введённое, иначе пустая строка
// (раньше такие поля, например work_place, в state.meta не попадали вовсе)
function collectOptionalMeta() {
    const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const working = val('is_working') === 'Да';
        if (!working) state.meta.work_type = '';
    state.meta.work_sphere = working ? val('work_sphere') : '';
    state.meta.work_sphere_other = (working && val('work_sphere') === 'Другое') ? val('work_sphere_other') : '';
    state.meta.work_type_other = (working && val('work_type') === 'Другое') ? val('work_type_other') : '';
    state.meta.financial_support_other = (val('financial_support') === 'Другое') ? val('financial_support_other') : '';
}
function toggleEduBlock() {
const status = document.getElementById('edu_status').value;
document.getElementById('edu_block').style.display = (status === "Учусь" || status === "Закончил") ? 'block' : 'none';
document.getElementById('course_block').style.display = (status === "Учусь") ? 'block' : 'none';
}
function toggleKmnsName() {
const isKmns = document.getElementById('is_kmns').value === "Да";
document.getElementById('kmns_name_block').style.display = isKmns ? 'block' : 'none';
// Если выбрали "Нет", очищаем поле, чтобы не отправлять старое значение
if (!isKmns) {
    document.getElementById('kmns_name').value = "";
}
}
function validateForm() {
// --- DEV-РЕЖИМ  ---
let rawFio = document.getElementById('fio');
if (rawFio && rawFio.value.toLowerCase().trim() === 'dev') {
    const devBtn = document.getElementById('dev-autofill-btn');
    if (devBtn) devBtn.style.display = 'block';

    // Собираем все поля: если какое-то поле ты выбрал для теста — берем его, иначе ставим заглушку
    const allIds = ['gender','age','is_kmns','kmns_name','family_status','children','financial_support','is_working','work_type','has_secondary_edu','edu_status','university','speciality','edu_level','edu_basis','course'];
    allIds.forEach(id => {
        const el = document.getElementById(id);
        state.meta[id] = (el && el.value && el.value.trim() !== '') ? el.value : 'DEV';
    });
    collectOptionalMeta();
    state.meta.fio = 'DEV';
    state.meta.mode = 'dev';

    // Прячем возможные плашки ошибок и сразу запускаем опрос
    document.getElementById('consent-error').style.display = 'none';
    document.getElementById('form-error').style.display = 'none';
    saveStateToLocal();
    goNext('form');
    return;
}
// 0. ПРОВЕРКА СОГЛАСИЯ (обязательна в любом режиме, включая анонимный)
if (!document.getElementById('consent_check').checked) {
    const block = document.getElementById('consent_block');
    block.classList.remove('consent-error-state');
    void block.offsetWidth; // Перезапуск анимации "shake" при повторных кликах
    block.classList.add('consent-error-state');
    document.getElementById('consent-error').style.display = 'block';
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return; // Не пускаем дальше без согласия
}
// 1. Формируем список актуальных полей в зависимости от статуса обучения
let ids = ['fio','gender','age','is_kmns','family_status','children','financial_support','is_working','has_secondary_edu','edu_status'];
if (document.getElementById('is_working').value === 'Да') ids.push('work_type');
const status = document.getElementById('edu_status').value;;
if(status === 'Учусь') ids = ids.concat(['university','speciality','edu_level','edu_basis','course']);
else if(status === 'Закончил') ids = ids.concat(['university','speciality','edu_level','edu_basis']);

let valid = true;
anonMode = document.getElementById('anon_mode').checked;
collectOptionalMeta();
anonMode = document.getElementById('anon_mode').checked;

if (!anonMode) {
    // --- ОБЫЧНЫЙ РЕЖИМ --- (Строгая проверка всех полей)
    ids.forEach(id => {
        let el = document.getElementById(id);
        if(!el || !el.value) { 
            if(el) el.style.borderColor = "var(--error)"; 
            valid = false; 
        } else { 
            if(el) el.style.borderColor = "#ddd"; 
            state.meta[id] = el.value; 
        }
    });
    
    // Сохраняем kmns_name (оно необязательное в обычном режиме)
    let kmnsEl = document.getElementById('kmns_name');
    state.meta['kmns_name'] = (kmnsEl && kmnsEl.value.trim() !== "") ? kmnsEl.value : "";
    
    if(!valid) { 
        document.getElementById('form-error').style.display = 'block'; 
        return; // Прерываемся, просим дозаполнить
    }
} else {
    // --- АНОНИМНЫЙ РЕЖИМ --- (Сохраняем всё, что ввели, остальное - "Аноним")
    ids.forEach(id => {
        let el = document.getElementById(id);
        // Если поле существует, имеет значение и это не пустая строка
        if (el && el.value && el.value.trim() !== "") {
            state.meta[id] = el.value; // Сохраняем реальные данные
        } else {
            state.meta[id] = "Аноним"; // Заполняем пустоты
        }
        if(el) el.style.borderColor = "#ddd"; // Убираем красные рамки, если были
    });
    // Защита от дурака: принудительно стираем ФИО в анонимном режиме
    state.meta['fio'] = "Аноним"; 
    
    // Сохраняем kmns_name
    let kmnsEl = document.getElementById('kmns_name');
    state.meta['kmns_name'] = (kmnsEl && kmnsEl.value && kmnsEl.value.trim() !== "") ? kmnsEl.value : "Аноним";
    // --- ЛОГИКА "SOFT ASK" (Мягкая просьба) ---
    // Проверяем, заполнил ли аноним наши самые главные поля (пол и возраст)
    let ageVal = state.meta['age'];
    let genderVal = state.meta['gender'];
    
    if (ageVal === "Аноним" || genderVal === "Аноним") {
        // Если нет — показываем окно с просьбой (которое мы обсуждали в шагах 2 и 3)
        showSoftAskModal();
        return; // Прерываем переход, пока не нажмут кнопку в модалке
    }
}
// Если всё ок (или Soft Ask уже пройден), идем дальше
document.getElementById('form-error').style.display = 'none';
saveStateToLocal();
goNext('form');
}
function renderBratus() {
    const c = document.getElementById('bratus-options'); 
    c.innerHTML = "";
    
    // Считаем, сколько вариантов уже ушло, чтобы показать остаток
    let usedCount = (state.rank - 1) * 3;
    let remainingCount = 24 - usedCount;

    // Добавляем счетчик оставшихся вариантов (компактно и без лишних блоков)
    document.getElementById('bratus-sub').innerHTML = `
        Выберите <b>3</b> утверждения для <b>${state.rank}-го места</b><br>
        <span style="font-size: 0.85em; color: var(--text-muted); font-weight: normal;">
            (осталось вариантов: ${remainingCount} из 24)
        </span>
    `;

    let used = [];
for(let k in state.bratus) if(parseInt(k) !== state.rank) used = used.concat(state.bratus[k]);

bratus_stmts.forEach(s => {
    if(!used.includes(s.id)) {
        let div = document.createElement('div'); div.className = 'option-card'; div.innerHTML = `<input type="checkbox" value="${s.id}"> ${s.t}`;
        if(state.bratus[state.rank] && state.bratus[state.rank].includes(s.id)) { div.classList.add('checked'); div.querySelector('input').checked = true; }
        div.onclick = (e) => { 
            if(e.target.tagName!=='INPUT') div.querySelector('input').click(); 
            div.classList.toggle('checked', div.querySelector('input').checked); 
            saveStateToLocal();
        };
        div.querySelector('input').onchange = () => saveStateToLocal();
        c.appendChild(div);
    }
});
updateProgress();
}
function nextBratusRank() {
const ch = document.querySelectorAll('#bratus-options input:checked');
if(ch.length !== 3) { document.getElementById('bratus-error').style.display = 'block'; return; }
document.getElementById('bratus-error').style.display = 'none';
state.bratus[state.rank] = Array.from(ch).map(i => parseInt(i.value));
saveStateToLocal();
if(state.rank < 8) { state.rank++; renderBratus(); window.scrollTo(0,0); }
else { goNext('bratus'); }
}
function prevBratusRank() { if(state.rank > 1) { state.rank--; renderBratus(); } else goPrev('bratus'); saveStateToLocal(); }
function renderMilman() {
const c = document.getElementById('milman-container');
if(c.innerHTML) {
    for(let k in state.milman) { 
        let el = document.querySelector(`input[name="m_${k}"][value="${state.milman[k]}"]`); 
        if(el) el.checked = true; 
        let row = document.getElementById('row_m_' + k);
        if(row) row.classList.add('answered');
    }
    return; 
}
milman_qs.forEach((q, qi) => {
    let h = `<div class="q-block"><h3>${qi+1}. ${q.q}</h3><table><thead><tr><th>Утверждение</th><th>Да, согласен</th><th>Пожалуй согласен </th><th>Когда как</th><th>Нет / Не знаю</th></tr></thead><tbody>`;
    q.i.forEach((txt, ii) => {
        let nm = `m_${qi}_${ii}`;
        h += `<tr id="row_${nm}"><td>${txt}</td>
        <td data-label="Да"><input type="radio" name="${nm}" value="3" onclick="saveM('${nm}',3)"></td>
        <td data-label="Пожалуй"><input type="radio" name="${nm}" value="2" onclick="saveM('${nm}',2)"></td>
        <td data-label="Когда как"><input type="radio" name="${nm}" value="1" onclick="saveM('${nm}',1)"></td>
        <td data-label="Нет/Не знаю"><input type="radio" name="${nm}" value="0" onclick="saveM('${nm}',0)"></td></tr>`;
    });
    c.innerHTML += h + "</tbody></table></div>";
});
for(let k in state.milman) { 
    let el = document.querySelector(`input[name="m_${k}"][value="${state.milman[k]}"]`); 
    if(el) el.checked = true; 
    let row = document.getElementById('row_m_' + k);
    if(row) row.classList.add('answered');
}
updateProgress();
}
function saveM(k, v) { 
state.milman[k.replace('m_','')] = v; 
let row = document.getElementById('row_'+k);
row.classList.remove('highlight-error'); 
row.classList.add('answered');
saveStateToLocal(); 
}
function finishMilman() {
if(!validateGroup('m', 14, 8)) return;

// Check for Fast Clicker (less than 90s)
checkFast('milman', 90, 'FAST_MILMAN');
goNext('milman');
}
function prevMilman() { goPrev('milman'); }
function renderIPL() {
const c = document.getElementById('ipl-container');
if(c.innerHTML) {
    for(let k in state.ipl) { 
        let el = document.querySelector(`input[name="ipl_${k}"][value="${state.ipl[k]}"]`); 
        if(el) el.checked = true; 
        let row = document.getElementById('row_ipl_' + k);
        if(row) row.classList.add('answered');
    }
    return;
}
let h = `<table><thead><tr><th>Утверждение</th><th>Не согласен</th><th>Скорее не согласен</th><th>Сложно сказать</th><th>Скорее согласен</th><th>Согласен</th></tr></thead><tbody>`;
ipl_qs.forEach((txt, i) => {
    let nm = `ipl_${i}`;
    const mobileLabels = ["Нет", "Скорее нет", "Не знаю", "Скорее да", "Да"]; 
    h += `<tr id="row_${nm}"><td>${i+1}. ${txt}</td>${[1,2,3,4,5].map((v, idx) => `<td data-label="${mobileLabels[idx]}"><input type="radio" name="${nm}" value="${v}" onclick="saveI(${i},${v})"></td>`).join('')}</tr>`;
});
c.innerHTML = h + "</tbody></table>";
for(let k in state.ipl) { 
    let el = document.querySelector(`input[name="ipl_${k}"][value="${state.ipl[k]}"]`); 
    if(el) el.checked = true; 
    let row = document.getElementById('row_ipl_' + k);
    if(row) row.classList.add('answered');
}
updateProgress();
}
function saveI(i, v) { 
state.ipl[i] = v; 
let row = document.getElementById('row_ipl_'+i);
row.classList.remove('highlight-error'); 
row.classList.add('answered');
saveStateToLocal(); 
}
function prevIPL() { goPrev('ipl'); }
// --- СЖО (тест смысложизненных ориентаций) ---
function renderSJO() {
    const c = document.getElementById('sjo-container');
    if (!c.innerHTML) {
        const labels = [3, 2, 1, 0, 1, 2, 3];   // позиции слева направо; в state хранится позиция 1..7
        let h = '';
        sjo_qs.forEach((q, i) => {
            h += `<div class="sjo-item" id="row_sjo_${i}"><span class="sjo-num">${i + 1}</span>
                <div class="sjo-left"><span class="sjo-tag">А.</span>${q[0]}</div>
                <div class="sjo-scale">${labels.map((lab, idx) => `<label class="sjo-opt"><input type="radio" name="sjo_${i}" value="${idx + 1}" onclick="saveSJO(${i},${idx + 1})"><span>${lab}</span></label>`).join('')}</div>
                <div class="sjo-right"><span class="sjo-tag">Б.</span>${q[1]}</div>
            </div>`;
        });
        c.innerHTML = h;
    }
    // восстановить ранее данные ответы
    for (let k in (state.sjo || {})) {
        const el = document.querySelector(`input[name="sjo_${k}"][value="${state.sjo[k]}"]`);
        if (el) el.checked = true;
        const row = document.getElementById('row_sjo_' + k);
        if (row) row.classList.add('answered');
    }
}
function saveSJO(i, v) {
    if (!state.sjo) state.sjo = {};
    state.sjo[i] = v;
    const row = document.getElementById('row_sjo_' + i);
    row.classList.remove('highlight-error');
    row.classList.add('answered');
    if (Object.keys(state.sjo).length === sjo_qs.length) document.getElementById('sjo-error').style.display = 'none';
    saveStateToLocal();
}
function validateSJO() {
    for (let i = 0; i < sjo_qs.length; i++) {
        if (!(state.sjo && state.sjo[i])) {
            const row = document.getElementById('row_sjo_' + i);
            row.classList.add('highlight-error');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('sjo-error').style.display = 'block';
            return false;
        }
    }
    document.getElementById('sjo-error').style.display = 'none';
    return true;
}
function finishSJO() {
    if (!validateSJO()) return;
    checkFast('sjo', 30, 'FAST_SJO');   // 20 пар утверждений быстрее 30 сек
    goNext('sjo');
}
function prevSJO() { goPrev('sjo'); }
// --- ФИНАЛ ---
function finishSurvey(skipFetch = false) {
if(!skipFetch && !validateGroup('ipl', 36, 1)) return;
state.finished = true; 
//Расчет итогового времени
state.timing.end = Date.now(); 
let total_sec = Math.round((state.timing.end - state.timing.start) / 1000);
let m = Math.floor(total_sec / 60);
let s = total_sec % 60;
// Формат ММ.СС (с добавлением ведущего нуля для секунд, например 10.05)
state.timing.total_formatted = m + "." + (s < 10 ? "0" : "") + s;
// Проверка Fast Clicker для ИПЛ (36 вопросов быстрее 60 сек)
checkFast('ipl', 60, 'FAST_IPL');
saveStateToLocal();
updateProgress();
if(skipFetch) {
    switchStep('step-ipl', 'step-results'); 
    switchStep('step-form', 'step-results'); 
    calculateAndShowResults(true);
    return;
}
switchStep('step-ipl', 'step-loading');
const isDev = state.meta.mode === 'dev';
const devCloudBox = document.getElementById('dev-send-cloud');
const devSendToCloud = isDev && devCloudBox && devCloudBox.checked;
if ((!isDev || devSendToCloud) && GOOGLE_URL) {
    // Создаем глобальную функцию для отправки, чтобы вызывать её по кнопке повторно
        window.retryCloudSync = function() {
        document.getElementById('final-msg').innerHTML = "⏳ Отправка данных в облако...";
        // Уникальный ID прохождения: по нему сервер не даст сделать дубль при повторной отправке
        if (!state.meta.submission_id) {
            state.meta.submission_id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
            saveStateToLocal();
        }
        fetch(GOOGLE_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(state) })
        .then(r => r.json())
        .then(res => {
            if (!res.ok) throw new Error(res.error || "server error");
            document.getElementById('final-msg').innerHTML = "Данные успешно <b style='color:green'>сохранены в облаке</b>."; 
        })
        .catch((err) => { 
            console.error("Ошибка отправки:", err);
            document.getElementById('final-msg').innerHTML = `
                <b style='color:red'>Ошибка отправки!</b> Пожалуйста, проверьте подключение к интернету.<br>
                <button class='btn btn-secondary' style='margin-top: 10px; margin-bottom: 10px; width: auto; padding: 8px 15px;' onclick='window.retryCloudSync()'>
                    ↻ Повторить отправку
                </button><br>
                <span style='font-size:0.9em; color:#555;'>Если ошибка сохраняется, разверните вкладку <b>«⚙️ Резервное сохранение»</b> чуть ниже и скачайте файл.</span>
            `; 
        });
    };
    // Запускаем первую попытку отправки
    window.retryCloudSync();
} else {
    console.log("DEV MODE: Отправка заблокирована.");
    document.getElementById('final-msg').innerHTML = isDev ? "<b style='color:orange'>[РЕЖИМ РАЗРАБОТЧИКА]</b> Отправка в облако отключена." : "<b style='color:orange'>[ЛОКАЛЬНЫЙ ПРОТОТИП]</b> Адрес облака не задан, отправка отключена. Скачайте результат во вкладке «Резервное сохранение».";
}
calculateAndShowResults();}

function toggleDetails(id) {
const el = document.getElementById(id);
if (!el) return;
const isOpening = (el.style.display === 'none' || el.style.display === '');
el.style.display = isOpening ? 'block' : 'none';
// Обновляем состояние кнопки
const button = document.querySelector(`[data-target="${id}"]`);
if (button) {
    button.setAttribute('aria-expanded', isOpening ? 'true' : 'false');
}
if (isOpening && id === 'detailsMilman') {
    renderMilmanDetailedCharts();
}
}
function renderMilmanDetailedCharts() {
if (!window.milmanData) {
    console.warn("Нет данных Мильмана для отрисовки");
    return;
}
const { scales_names, life_ideal_data, life_real_data, work_ideal_data, work_real_data } = window.milmanData;
// Уничтожаем старые графики, ТОЛЬКО если это Chart
if (window.chartMilmanLife && typeof window.chartMilmanLife.destroy === "function") {
    window.chartMilmanLife.destroy();
}
if (window.chartMilmanWork && typeof window.chartMilmanWork.destroy === "function") {
    window.chartMilmanWork.destroy();
}
// ЖИЗНЬ
const ctxLife = document.getElementById('chartMilmanLife');
if (ctxLife) {
    window.chartMilmanLife = new Chart(ctxLife.getContext('2d'), {
        type: 'line',
        data: {
            labels: scales_names,
            datasets: [
                {
                    label: 'Идеал',
                    data: life_ideal_data,
                    fill: true,
                    pointStyle: 'circle',
                    pointRadius: 10,
                    pointHoverRadius: 15
                },
                {
                    label: 'Реальность',
                    data: life_real_data,
                    fill: true,
                    pointStyle: 'triangle',
                    pointRadius: 10,
                    pointHoverRadius: 15
                }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { min: 0 } }
        }
    });
}
// РАБОТА
const ctxWork = document.getElementById('chartMilmanWork');
if (ctxWork) {
    window.chartMilmanWork = new Chart(ctxWork.getContext('2d'), {
        type: 'line',
        data: {
            labels: scales_names,
            datasets: [
                {
                    label: 'Идеал',
                    data: work_ideal_data,
                    fill: true,
                    pointStyle: 'circle',
                    pointRadius: 10,
                    pointHoverRadius: 15
                },
                {
                    label: 'Реальность',
                    data: work_real_data,
                    fill: true,
                    pointStyle: 'triangle',
                    pointRadius: 10,
                    pointHoverRadius: 15
                }
            ]
        },
        options: { responsive: true, scales: { y: { min: 0 } }
        }
    });
}
// ===== ЭМОЦИОНАЛЬНЫЙ ПРОФИЛЬ (ПО МИЛЬМАНУ) =====
if (window.chartMilmanEmo && typeof window.chartMilmanEmo.destroy === "function") {
window.chartMilmanEmo.destroy();
}
const ctxEmo = document.getElementById("chartMilmanEmo");
if (ctxEmo) {
const labels = ["Обычное состояние", "Стрессовая ситуация"];
window.chartMilmanEmo = new Chart(ctxEmo.getContext("2d"), {
    type: "line",
    data: {
        labels,
        datasets: [
            {
                label: "Стенические реакции (активные)",
                data: [ emo.E_st, emo.F_st ],
                borderWidth: 3,
                tension: 0,
                fill: false,
                pointStyle: 'circle',
                pointRadius: 10,
                pointHoverRadius: 15
            },
            {
                label: "Астенические реакции (пассивные)",
                data: [ emo.E_ast, emo.F_ast ],
                borderWidth: 3,
                tension: 0,
                fill: false,
                pointStyle: 'circle',
                pointRadius: 10,
                pointHoverRadius: 15
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: true }
        },
        scales: {
            x: {
        offset: true,
    },
            y: {
                beginAtZero: true,
                suggestedMax: Math.max(
                    emo.E_ast, emo.E_st, emo.F_ast, emo.F_st
                ) + 3
            }
        }
        
    }
});
}
}
// Очистка предупреждающей подсветки при вводе данных (UX Soft Ask)
const ageInput = document.getElementById('age');
if (ageInput) {
    ageInput.addEventListener('input', function() {
        this.style.borderColor = 'var(--input-border)';
    });
}
const genderSelect = document.getElementById('gender');
if (genderSelect) {
    genderSelect.addEventListener('change', function() {
        this.style.borderColor = 'var(--input-border)';
    });
}
// Очистка красной подсветки ошибок в основной анкете при вводе данных
const requiredDemographicIds = ['fio','gender','age','is_kmns','family_status','children','financial_support','is_working','work_type','has_secondary_edu','edu_status','university','speciality'];
requiredDemographicIds.forEach(id => {
    const field = document.getElementById(id);
    if (field) {
        // Событие 'input' срабатывает при вводе текста/цифр
        field.addEventListener('input', function() {
            this.style.borderColor = 'var(--input-border)';
            this.classList.remove('highlight-error'); // На случай, если стиль задан классом
        });
        
        // Событие 'change' срабатывает при выборе опции в селектах (пол, образование)
        field.addEventListener('change', function() {
            this.style.borderColor = 'var(--input-border)';
            this.classList.remove('highlight-error');
        });
    }
});
// ==========================================
// ФУНКЦИЯ КОПИРОВАНИЯ EMAIL В БУФЕР
// ==========================================
function copyEmailToClipboard(email, element) {
    // Используем современный API буфера обмена
    navigator.clipboard.writeText(email).then(() => {
        // Добавляем класс конкретному элементу, на который кликнули
        element.classList.add('show-tooltip');
        
        // Прячем её обратно через 2 секунды
        setTimeout(() => {
            element.classList.remove('show-tooltip');
        }, 2000);
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
        // Если браузер заблокировал копирование
        window.location.href = `mailto:${email}`;
    });
}