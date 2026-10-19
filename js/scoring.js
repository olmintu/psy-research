function calculateAndShowResults(immediate = false) {
    // Запуск анимации галочки ---
    if (!immediate) {
        setTimeout(() => {
            document.getElementById('loading-spinner').style.display = 'none';
            document.getElementById('loading-text').style.display = 'none';
            document.getElementById('loading-title').innerHTML = '<span style="color:var(--success)">Готово!</span>';
            document.getElementById('success-checkmark').style.display = 'block';
        }, 800); // Через 800мс после начала расчета прячем спиннер и рисуем галочку
}
    // 1. БРАТУСЬ
    const cats_map = { 'Альтруистические': [1,9,17], 'Экзистенциальные': [2,10,18], 'Гедонистические': [3,11,19], 'Самореализации': [4,12,20], 'Статусные': [5,13,21], 'Коммуникативные': [6,14,22], 'Семейные': [7,15,23], 'Когнитивные': [8,16,24] };
    let b_labels=[], b_data=[], b_desc="";
    let id_to_rank = {}; for(let r in state.bratus) state.bratus[r].forEach(id => id_to_rank[id] = parseInt(r));
    // Создаем массив для сортировки: [{name, sum, status}, ...]
    let categories = [];
    for(let c in cats_map) { 
        let sum = 0; cats_map[c].forEach(id => sum += (id_to_rank[id] || 0)); 
        b_labels.push(c); b_data.push(sum);
        let status = sum <= 9 ? "<span style='color:green'>Доминируют</span>" : (sum <= 17 ? "<span style='color:blue'>Представлены достаточно</span>" : "<span style='color:red'>Представлены слабо</span>");
        categories.push({name: c, sum: sum, status: status});
    }
    // Сортируем категории по значению (от меньшего к большему)
    categories.sort((a, b) => a.sum - b.sum);
    // Формируем b_desc в отсортированном порядке
    for(let cat of categories) {
        b_desc += `<div><b>${cat.name}:</b> ${cat.sum} (${cat.status})</div>`;
    }
    const sub_map = {
  0:'life_ideal',
  1:'work_ideal',
  2:'life_real',
  3:'work_real',

  4:'life_ideal',
  5:'work_ideal',
  6:'life_real',
  7:'work_real',

  8:'life_ideal',
  9:'work_ideal',
  10:'life_real',
  11:'work_real'
};
let m_scores = {
  life: {
    ideal: { P:0,K:0,S:0,O:0,D:0,DR:0,OD:0 },
    real:  { P:0,K:0,S:0,O:0,D:0,DR:0,OD:0 }
  },
  work: {
    ideal: { P:0,K:0,S:0,O:0,D:0,DR:0,OD:0 },
    real:  { P:0,K:0,S:0,O:0,D:0,DR:0,OD:0 }
  }
};
   // Эмоциональный профиль
   window.emo = { E_st:0, E_ast:0, F_st:0, F_ast:0 };
let emo = window.emo;
// Подсчёт Мильмана
// --- НАЧАЛО ОБНОВЛЕННОГО ЦИКЛА ---
for(let q = 0; q < 14; q++) {
    // Проходим по всем 8 вариантам ответа
    for(let i = 0; i < 8; i++) {
        let val = state.milman[`${q}_${i}`] || 0;
        let keyString = m_keys[q][i]; // Теперь это может быть "S,O"
        // Разбиваем ключи по запятой (если их несколько)
        let targets = keyString.split(',');
        targets.forEach(scale => {
            scale = scale.trim(); // Убираем пробелы, если есть
            if (scale === '-') return; // Пропускаем пустышки
            if (q < 12) { 
                // ===== МОТИВАЦИЯ =====
                let sub = sub_map[q]; 
                let [scope, state2] = sub.split('_'); 
                // Проверяем, существует ли такая шкала (защита от ошибок)
                if(m_scores[scope][state2][scale] !== undefined) {
                    m_scores[scope][state2][scale] += val;
                }
            } else {
                // ===== ЭМОЦИИ (Вопросы 12 и 13 по индексу, в методичке это 13 и 14) =====
                // Здесь двойных ключей нет, но логика остаётся прежней
                if(q === 12) { 
                    if(scale === 'st') emo.E_st += val;
                    if(scale === 'ast') emo.E_ast += val;
                }
                if(q === 13) {
                    if(scale === 'st') emo.F_st += val;
                    if(scale === 'ast') emo.F_ast += val;
                }
            }
        });
    }
}
// --- КОНЕЦ ОБНОВЛЕННОГО ЦИКЛА ---
   let emoIsUndefined = false;
   let emoTypeText = "<span class='score-badge bg-blue'>Не определён</span> Не удаётся однозначно отнести профиль к одному из типов";
if (emo.E_st > emo.E_ast && emo.F_st > emo.F_ast) {
    emoTypeText = "<span class='score-badge bg-blue'>Стенический</span> — деятельный и устойчивый тип. Вы не только предпочитаете активные, бодрые эмоции, но и в трудных ситуациях действуете собранно, конструктивно и не падаете духом. Стресс вас мобилизует.";
}
else if (emo.E_ast > emo.E_st && emo.F_ast > emo.F_st) {
    emoTypeText = "<span class='score-badge bg-blue'>Астенический</span> — чувствительный тип, стремящийся к гармонии и покою. Вы предпочитаете спокойные, приятные эмоции, а в стрессе склонны переживать, раздражаться или чувствовать беспомощность. Вам следует избегать перегрузок.";
}
else if (emo.E_ast > emo.E_st && emo.F_st > emo.F_ast) {
    emoTypeText = "<span class='score-badge bg-blue'>Смешанный стенический</span> В обычной жизни вам по душе уют, гармония и приятные эмоции. Но когда возникает реальная проблема или вызов, вы умеете собраться, стать активным и начать действовать решительно. Ваша сила проявляется в нужный момент.";
}
else if (emo.E_st > emo.E_ast && emo.F_ast > emo.F_st) {
    emoTypeText = "<span class='score-badge bg-blue'>Смешанный астенический</span> Вы эмоционально активный и энергичный человек в повседневности. Однако в ситуациях давления, конфликтов или неудач эта энергия может смениться растерянностью, раздражением или обидой. Вам нужно учиться направлять свою активную энергию на преодоление трудностей.";
}
else {
    emoIsUndefined = true;
}
window.emoIsUndefined = emoIsUndefined;
window.emoTypeText = emoTypeText;
const warning = document.getElementById("emoWarningBlock");
if (emoTypeText === "<span class='score-badge bg-blue'>Не определён</span> Не удаётся однозначно отнести профиль к одному из типов") {
    warning.style.display = "block";
    warning.innerHTML = `
<b>⚠️ Почему тип вашего эмоционального профиля не определился?</b><br><br>
Тест сравнивает два параметра: обычное эмоциональное состояние и реакцию на стресс.  
В вашем случае баллы по одному или обоим параметрам оказались равными, поэтому невозможно определить, какой стиль преобладает.<br><br>

<b>Это не ошибка.</b> Это означает, что ваш профиль находится в балансе или вы гибко реагируете в разных ситуациях. Для точного определения можно пройти тест повторно через время или обратиться к специалисту для более глубокого анализа.

Это нормальный результат, который просто выходит за рамки автоматической классификации.
`;
} else {
    warning.style.display = "none";
}
// ===== ДАННЫЕ ДЛЯ ГРАФИКОВ МИЛЬМАНА =====
const scales_order = ['P','K','S','O','D','DR','OD'];
const scales_names = [
  'Жизнеобеспечение',
  'Комфорт',
  'Социальный статус',
  'Общение',
  'Общая активность',
  'Творческая активность',
  'Общественная польза'
];
// ЖИЗНЬ
let life_ideal_data = scales_order.map(s => m_scores.life.ideal[s]);
let life_real_data  = scales_order.map(s => m_scores.life.real[s]);
// РАБОТА
let work_ideal_data = scales_order.map(s => m_scores.work.ideal[s]);
let work_real_data  = scales_order.map(s => m_scores.work.real[s]);
// ===== ИНТЕГРАЛЬНЫЙ ПРОФИЛЬ =====
let integral_ideal_data = scales_order.map((s, i) =>
    (life_ideal_data[i] + work_ideal_data[i]) / 2
);
let integral_real_data = scales_order.map((s, i) =>
    (life_real_data[i] + work_real_data[i]) / 2
);
window.milmanData = {
    scales_names,
    life_ideal_data,
    life_real_data,
    work_ideal_data,
    work_real_data
};  
// ОБЪЕКТ ДЛЯ АНАЛИЗА ТИПА
let integral = {};
scales_order.forEach((s, i) => {
    integral[s] = integral_ideal_data[i];
});
// ===== ТИП МОТИВАЦИОННОГО ПРОФИЛЯ (ПО ИНТЕГРАЛУ ИДЕАЛОВ) =====
let sum_develop = integral.D + integral.DR + integral.OD;
let sum_maintain = integral.P + integral.K + integral.S;
let diff = sum_develop - sum_maintain;
let motivationTypeText = "";
if (diff >= 5) {
    motivationTypeText = "<span class='score-badge bg-blue'>Прогрессивный</span> Вы — человек роста. Для вас важнее двигаться вперёд, осваивать новое и развиваться, чем просто сохранять текущее положение дел. Это качество часто ведёт к успеху в работе и учёбе.";
}
else if (diff <= -5) {
    motivationTypeText = "<span class='score-badge bg-blue'>Регрессивный</span> Для вас главное — стабильность, комфорт и сохранение того, что уже есть. Мотивы «оставить всё как есть» обычно сильнее, чем желание рисковать и меняться. Это может приводить к застою.";
}
else {
    // считаем пики
    let values = scales_order.map(s => integral[s]);
    let peaks = 0;
    for(let i = 0; i < values.length; i++) {
        let v = values[i];
        if (i === 0) {
            if (v >= values[1] + 4) peaks++;
        }
        else if (i === values.length - 1) {
            if (v >= values[values.length - 2] + 4) peaks++;
        }
        else {
            if (v >= values[i-1] + 2 && v >= values[i+1] + 2) peaks++;
        }
    }
    if (peaks >= 3) motivationTypeText = "<span class='score-badge bg-blue'>Импульсивный</span> Ваша мотивация — это внутренние качели. У вас одновременно есть несколько очень сильных, но разных и даже противоречивых желаний. Из-за этого ваши интересы и энергия могут часто и резко переключаться.";
    else if (peaks === 2) motivationTypeText = "<span class='score-badge bg-blue'>Экспрессивный</span> У вас чёткие приоритеты: вы ярко выделяете что-то важное для себя как в сфере комфорта, так и в сфере достижений. Вы стремитесь к самоутверждению и любите, когда ваши успехи и особенности замечают другие.";
    else motivationTypeText = "<span class='score-badge bg-blue'>Уплощенный</span> У вас нет ярко выраженных «вершин» или «провалов» среди мотивов — все они выражены примерно одинаково. Это может означать, что пока нет чётких жизненных приоритетов или внутренняя картина желаний недостаточно ясна. Заметна тенденция его уменьшения с возрастом.";
}
    // 3. ИПЛ
    let ipl_sum = 0;
    let rev_idx = [0, 4, 6, 8, 9, 13, 14, 15, 19, 21, 23, 24, 25, 26, 27, 30, 31, 32];
    for(let i=0; i<36; i++) { let val = state.ipl[i]; if(rev_idx.includes(i)) val = 6 - val; ipl_sum += val; }
    // ===== ЭТАП 1. Типы реализации ИПЛ (6 шкал) =====
// Вспомогательная функция: получить ответ по номеру вопроса (1-based)
function A(q) {
    return state.ipl[q - 1] || 0;
}
// 6 типов реализации (БЕЗ инверсий, строго по методике)
let ipl_types = {
    OI: A(8) + A(13) + A(17) + A(21) + A(30) + A(34),
    FN: A(1) + A(5) + A(16) + A(24) + A(25) + A(32),

    PD: A(2) + A(6) + A(18) + A(19) + A(23) + A(29),
    NG: A(9) + A(14) + A(22) + A(27) + A(28) + A(33),

    IP: A(3) + A(4) + A(11) + A(12) + A(35) + A(36),
    VP: A(7) + A(10) + A(15) + A(20) + A(26) + A(31)
};
// ===== ОПРЕДЕЛЕНИЕ СТИЛЯ ИПЛ =====
function pick(aName, aVal, bName, bVal) {
    if (aVal > bVal) return aName;
    if (bVal > aVal) return bName;
    return null; // равны — не определено
}
let t1 = pick("OI", ipl_types.OI, "FN", ipl_types.FN);
let t2 = pick("PD", ipl_types.PD, "NG", ipl_types.NG);
let t3 = pick("IP", ipl_types.IP, "VP", ipl_types.VP);
let iplStyleKey = null;
let iplStyleText = null;
let iplStyleDefined = true;
if (!t1 || !t2 || !t3) {
    iplStyleDefined = false;
} else {
    iplStyleKey = `${t1}_${t2}_${t3}`;
}
const IPL_STYLE_DESCRIPTIONS = {
    "OI_NG_VP": {
    title: "Осмысленно-интенсивный / Негативно-генерализованный / Вынужденно-приспособительный",
    text: "Вы активно и осмысленно ищете новое, но в целом склонны настороженно и обобщённо относиться к изменениям. В поведении чаще адаптируетесь к ситуации, чем пытаетесь её изменить. Это профиль осторожного исследователя: вы много наблюдаете и анализируете, но действуете сдержанно и не сразу."
  },
  "OI_PD_VP": {
    title: "Осмысленно-интенсивный / Позитивно-дифференцированный / Вынужденно-приспособительный",
    text: "Вы активно ищете новую информацию и в целом положительно относитесь к изменениям, но в поведении чаще подстраиваетесь под обстоятельства, чем пытаетесь их менять. Вы склонны сначала понять и принять новое, прежде чем начинать активные действия."
  },
  "OI_NG_IP": {
    title: "Осмысленно-интенсивный / Негативно-генерализованный / Инициативно-преобразовательный",
    text: "Вы активно ищете новое и склонны критически относиться к изменениям, но при этом, если считаете ситуацию важной, действуете решительно и стремитесь её изменить. Это профиль человека, который не принимает новшества на веру, но готов бороться за нужные преобразования."
  },
  "OI_PD_IP": {
    title: "Осмысленно-интенсивный / Позитивно-дифференцированный / Инициативно-преобразовательный",
    text: "Вы активно ищете новое, позитивно и осмысленно относитесь к изменениям и готовы сами инициировать преобразования. Это наиболее «инновационный» профиль: вы не только принимаете новое, но и стремитесь воплощать его в реальность."
  },
  "FN_PD_IP": {
    title: "Формально-накопительский / Позитивно-дифференцированный / Инициативно-преобразовательный",
    text: "Вы скорее накапливаете информацию, чем активно ищете её, но при этом в целом положительно относитесь к изменениям и способны действовать инициативно. Часто вы начинаете действовать, когда видите понятную и полезную цель."
  },
  "FN_NG_IP": {
    title: "Формально-накопительский / Негативно-генерализованный / Инициативно-преобразовательный",
    text: "Вы склонны осторожно и критично относиться к новому, не стремитесь активно его искать, но в важных для себя ситуациях можете действовать решительно и настойчиво, пытаясь изменить положение дел."
  },
  "FN_PD_VP": {
    title: "Формально-накопительский / Позитивно-дифференцированный / Вынужденно-приспособительный",
    text: "Вы скорее воспринимаете и накапливаете информацию, чем активно её ищете, в целом неплохо относитесь к изменениям, но в поведении чаще адаптируетесь к обстоятельствам, чем пытаетесь их менять."
  },
  "FN_NG_VP": {
    title: "Формально-накопительский / Негативно-генерализованный / Вынужденно-приспособительный",
    text: "Вы не склонны активно искать новое, относитесь к изменениям скорее настороженно и в поведении предпочитаете приспосабливаться к ситуации. Это профиль ориентации на стабильность и сохранение привычного порядка."
  }
};
    // ===== ЭТАП 2. Аспекты ИПЛ (Г, А, П) =====
    // функция с учётом инверсий
function A2(q, inv = false) {
    let v = state.ipl[q - 1] || 0;
    return inv ? (6 - v) : v;
}
let ipl_aspects = {
    G: A2(1,true) + A2(5,true) + A2(8) + A2(13) + A2(16,true) + A2(17) + A2(21) + 
       A2(24,true) + A2(25,true) + A2(30) + A2(32,true) + A2(34),
    A: A2(2) + A2(6) + A2(9,true) + A2(14,true) + A2(18) + A2(19) +
       A2(22,true) + A2(23) + A2(27,true) + A2(28,true) + A2(29) + A2(33,true),
    P: A2(3) + A2(4) + A2(7,true) + A2(10,true) + A2(11) + A2(12) +
       A2(15,true) + A2(20,true) + A2(26,true) + A2(31,true) + A2(35) + A2(36)
};
    // ===== ЭТАП 3. Уровни взаимодействия с миром =====
let ipl_levels = {
    nature:
        A2(1,true) + A2(6) + A2(7,true) + A2(8) + A2(12) +
        A2(19) + A2(21) + A2(28,true) + A2(35),
    social:
        A2(2) + A2(5,true) + A2(9,true) + A2(11) +
        A2(22,true) + A2(26,true) + A2(31,true) + A2(32,true) + A2(34),
    culture:
        A2(3) + A2(10,true) + A2(13) + A2(14,true) +
        A2(16,true) + A2(20,true) + A2(23) + A2(24,true) + A2(27,true),
    life:
        A2(4) + A2(15,true) + A2(17) + A2(18) +
        A2(25,true) + A2(29) + A2(30) + A2(33,true) + A2(36)
};
function renderBigScalesBlock(title, dataArr, maxValue, color, labelsMap) {
    let html = `
        <div style="margin-top:25px;">
            <h3 style="margin-bottom:15px;">${title}</h3>
    `;
    dataArr.forEach(item => {
        let percent = Math.max(5, (item.value / maxValue) * 100);
        html += `
            <div style="margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; font-size:1.05em; margin-bottom:4px;">
                    <div><b>${labelsMap[item.key]}</b></div>
                    <div><b>${item.value}</b></div>
                </div>
                <div style="background:var(--border); border-radius:8px; overflow:hidden; height:22px;">
                    <div style="width:${percent}%; height:100%; background:${color};"></div>
                </div>
            </div>
        `;
    });
    html += `
        <div style="display:flex; justify-content:space-between; font-size:0.9em; color:#666; margin-top:4px;">
            <div>0</div>
            <div>${maxValue}</div>
        </div>
        </div>
    `;
    return html;
}
//шкалы типов реализации инновационного потенциала
function renderScalesBlock(title, dataObj, maxValue, color, descriptionHTML = "") {
    let html = `
    <div style="
        margin-top:25px;
        padding:18px;
        border-radius:12px;
        background:var(--surface);
        border:1px solid var(--border);
    ">
        <h2 style="margin-top:0;">${title}</h2>
        ${descriptionHTML}
    `;
    for (let key in dataObj) {
        let val = dataObj[key];
        let percent = Math.max(2, (val / maxValue) * 100);
        html += `
        <div style="display:flex; justify-content:space-between; font-size:1.05em; margin-bottom:4px;">
    <div style="max-width:85%;">
        <b>${key}</b>
    </div>
    <div><b>${val}</b></div>
</div>
                <div style="background:var(--border); border-radius:8px; overflow:hidden; height:22px;">
                    <div style="width:${percent}%; height:100%; background:${color};"></div>
                </div>
            </div>
        `;
    }
    html += `
        <div style="display:flex; justify-content:space-between; font-size:0.85em; color:#666; margin-top:-5px;">
            <div>0</div>
            <div>${maxValue}</div>
        </div>
    </div>
    `;
    return html;
}
//визуальное сравнение пар типов реакций
function renderIPLTypesPairs(ipl_types) {
    const MAX = 30; // 6 вопросов * 5 баллов
    function bar(name, value, isWinner, isEqual) {
        let base = "rgb(0,128,128)";
        let bg = isWinner ? base : "rgba(0,128,128,0.35)";
        let border = isWinner ? "3px solid #004d4d" : "1px solid #ccc";
        if (isEqual) {
            bg = "rgba(160,160,160,0.4)";
            border = "1px dashed #888";
        }
        let percent = Math.max(3, value / MAX * 100);
        return `
        <div style="margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; font-size:1.1em;">
                <div><b>${name}</b></div>
                <div>${value}</div>
            </div>
            <div style="background:var(--border); border-radius:6px; overflow:hidden; height:18px; border:${border}">
                <div style="width:${percent}%; height:100%; background:${bg};"></div>
            </div>
        </div>
        `;
    }
    function pairBlock(title, desc, aKey, aName, bKey, bName) {
        let a = ipl_types[aKey];
        let b = ipl_types[bKey];
        let aWin = a > b;
        let bWin = b > a;
        let isEqual = a === b;
        let note = "";
        if (isEqual) {
            note = `<div style="margin-top:6px; font-size:1.2em; color:#555;">⚠️ Различия не выявлены</div>`;
        }
        return `
        <div style="border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:15px;">
            <div style="font-size:1.1em; line-height:1.6; margin-bottom:12px;">${title}</div>
            <div style="font-size:1.1em; line-height:1.6; margin-bottom:12px;">${desc}</div>
            ${bar(aName, a, aWin, isEqual)}
            ${bar(bName, b, bWin, isEqual)}
            <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#666; margin-top:-4px;">
                <div>0</div>
                <div>${MAX}</div>
            </div>
            ${note}
        </div>
        `;
    }
    let html = `
    <h3>Типы реализации инновационного потенциала</h3>
    <div style="font-size:1.1em; line-height:1.6; margin-bottom:12px;">
        Эти шкалы показывают, <b>как именно</b> вы реализуете свои инновационные возможности:
        как ищете новое, как оцениваете изменения и как действуете в новой ситуации.
    </div>
    `;
    html += pairBlock(
        "<b>🧠 Обнаружение новой информации</b>",
        "Как вы ищете и осваиваете новое.",
        "OI", "Осмысленно-интенсивный",
        "FN", "Формально-накопительский"
    );
    html += pairBlock(
        "<b>⚖️ Оценка нового</b>",
        "Как вы относитесь к изменениям и нововведениям.",
        "PD", "Позитивно-дифференцированный",
        "NG", "Негативно-генерализованный"
    );
    html += pairBlock(
        "<b>🚀 Действие в новой ситуации</b> ",
        "Как вы ведёте себя, когда ситуация требует изменений.",
        "IP", "Инициативно-преобразовательный",
        "VP", "Вынужденно-приспособительный"
    );
    return html;
}
    // ============================================================
    // ПОДГОТОВКА ТАБЛИЦЫ БРАТУСЯ ДЛЯ ЭКСПОРТА 
        let bratusExportRows = [];
    for(let cName in cats_map) { 
        let ids = cats_map[cName]; // [1, 9, 17]
        let sum = 0; 
        let details = [];
        ids.forEach(id => {
            let r = id_to_rank[id] || 0; 
            sum += r;
            details.push({id: id, rank: r});
        });
        // Формируем строки: "№1 (ранг 4)"
        bratusExportRows.push({
            name: cName,
            sum: sum,
            status: sum <= 9 ? "Доминирует" : (sum <= 17 ? "Достаточно" : "Слабо"),
            v1: `№${details[0].id} (${details[0].rank})`,
            v2: `№${details[1].id} (${details[1].rank})`,
            v3: `№${details[2].id} (${details[2].rank})`
        });
    }
    bratusExportRows.sort((a, b) => a.sum - b.sum);
// ======================================================================
    // Увеличиваем задержку до 2000мс (800мс спиннер + 1200мс на красивую галочку)
    setTimeout(() => {
        if(!immediate) {
            switchStep('step-loading', 'step-results');
            // Сбрасываем экран загрузки обратно (на случай "Начать заново")
            setTimeout(() => {
                document.getElementById('loading-spinner').style.display = 'block';
                document.getElementById('loading-text').style.display = 'block';
                document.getElementById('loading-title').innerHTML = '<span style="color:var(--primary)">Обработка результатов...</span>';
                document.getElementById('success-checkmark').style.display = 'none';
            }, 500);
        }
        document.getElementById('result-area').value = JSON.stringify(state, null, 2);
// --- НОВЫЙ ВИЗУАЛ БРАТУСЯ ---
// Собираем массив
let brArr = [];
for(let i=0;i<b_labels.length;i++) {
    brArr.push({ name: b_labels[i], sum: b_data[i] });
}
// Сортируем: чем меньше сумма — тем выше
brArr.sort((a,b) => a.sum - b.sum);
// Рисуем
let html = `<div style="font-weight:bold; text-align:center; margin-bottom:10px;">Жизненные смыслы</div>`;
brArr.forEach(row => {
    let cls = '';
    let color = '';
    if(row.sum <= 9) color = '#27ae60';       // ведущие
    else if(row.sum <= 17) color = '#1268f3'; // нейтральные
    else color = '#e74c3c';                   // игнорируемые
    let percent = Math.max(5, (25 - row.sum) / 25 * 100);
    html += `
        <div style="display:flex; align-items:center; margin-bottom:8px; gap:10px;">
            <div style="width:180px; font-size:1.1em;">${row.name}</div>
            <div style="flex:1; background:var(--border); border-radius:6px; overflow:hidden; height:18px;">
                <div style="width:${percent}%; height:100%; background:${color};"></div>
            </div>
            <div style="width:40px; text-align:right; font-weight:bold;">${row.sum}</div>
        </div>
    `;
});
html += `
<div style="margin-top:10px; text-align:center; font-size:1.1em;">
    <span style="color:#27ae60; font-weight:bold;">■</span> ведущие →
    <span style="color:#1268f3; font-weight:bold;">■</span> нейтральные →
    <span style="color:#e74c3c; font-weight:bold;">■</span> игнорируемые
</div>
`;
document.getElementById('textBratus').innerHTML = html + '<div style="margin-top:15px;">' + b_desc + '</div>';
if(window.chartM) window.chartM.destroy();
window.chartM = new Chart(document.getElementById('chartMilman').getContext('2d'), {
    type: 'line',
    data: {
        labels: scales_names,
        datasets: [
            {
                label: 'Желаемое – Идеал',
                data: integral_ideal_data,
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39,174,96,0.1)',
                fill: true,
                pointStyle: 'circle',
                pointRadius: 10,
                pointHoverRadius: 15
            },
            {
                label: 'Текущее – Реальность',
                data: integral_real_data,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231,76,60,0.1)',
                fill: true,
                pointStyle: 'triangle',
                pointRadius: 10,
                pointHoverRadius: 15
                
            }
        ]
    },
    options: {
        scales: { y: { min: 0 } }
    }
});
document.getElementById('textMilman').innerHTML = `
    <div style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
        Выше показан <b>обобщённый профиль мотивации</b>: сравнение идеального и реального.
        Подробные профили (жизнь, работа, эмоции) см. во вкладке «Подробнее».
        <div style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
        <div><b>Общий тип мотивационного профиля:</b> ${motivationTypeText}</div>
        <div><p>   </p> </div>
        <div><b>Тип эмоционального профиля:</b> ${emoTypeText}</div>
    </div>
`;
        let ipl_level = ipl_sum >= 118 ? "Высокий" : (ipl_sum >= 95 ? "Средний" : "Низкий");
        let ipl_cls = ipl_sum >= 118 ? "bg-green" : (ipl_sum >= 95 ? "bg-blue" : "bg-red");
        let ipl_text = ipl_sum >= 118 ? "<b>Высокий уровень инновационного потенциала личности.</b> Вы ориентированы на развитие, поиск новых возможностей и преобразование ситуации. Новые задачи и изменения скорее воспринимаются как интересный вызов, чем как угроза. Вам свойственно самостоятельно искать новые способы действий и пересматривать привычные подходы. " : (ipl_sum >= 95 ? "<b>Средний уровень инновационного потенциала личности .</b> Вы в целом открыты к новому, но подходите к изменениям избирательно и осознанно. Прежде чем что-то менять, вам важно понять смысл, пользу и возможные последствия. Вы готовы осваивать новое, если видите в этом практическую ценность." : "<b>Низкий уровень инновационного потенциала личности.</b> Вы в целом открыты к новому, но подходите к изменениям избирательно и осознанно. Прежде чем что-то менять, вам важно понять смысл, пользу и возможные последствия. Вы готовы осваивать новое, если видите в этом практическую ценность.");
        let iplPercent = Math.round((ipl_sum / 180) * 100);
let iplColor =
    ipl_sum >= 118 ? "linear-gradient(90deg, #2ecc71, #27ae60)" :
    ipl_sum >= 95  ? "linear-gradient(90deg, #3498db, #2980b9)" :
                     "linear-gradient(90deg, #e74c3c, #c0392b)";

        document.getElementById('textIPL').innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                <div style="font-size:2.5em; font-weight:bold; color:#2c3e50;">${ipl_sum}</div>
                <div><span class="score-badge ${ipl_cls}" style="font-size:1.1em;">Уровень: ${ipl_level}</span></div>
            </div>
            <div style="margin-top:15px;">
    <div style="display:flex; justify-content:space-between; font-size:0.9em;">
       
    </div>
    <div style="background:var(--border); border-radius:20px; height:30px; overflow:hidden;">
        <div style="height:100%; width:${iplPercent}%; background:${iplColor};"></div>
    </div>
    <p>${ipl_text}</p>
</div>`;
let detailsHTML = "";
// 1. Типы реализации (попарное сравнение)
detailsHTML += renderIPLTypesPairs(ipl_types);
let styleHTML = `<div style="
    margin-top:25px;
    padding:18px;
    border-radius:12px;
    background:var(--surface);
    border:1px solid var(--border);
">`;
// Если стиль не определен, изменяем стиль фона
if(!iplStyleDefined) {
    styleHTML = styleHTML.replace('background:var(--surface);', 'background:var(--anon-bg);')
                         .replace('border:1px solid var(--border);', 'border:1px solid var(--border);');
}
styleHTML += `<h2 style="margin-top:0;">🧬 Стиль реализации инновационного потенциала</h2>`;
if (!iplStyleDefined) {
    styleHTML += `
        <div style="font-size:1.05em;">
            <b>⚠️ Стиль не может быть определён.</b><br><br>
            В одной или нескольких парах показателей значения оказались равными, поэтому невозможно выбрать доминирующий тип.
            Это означает баланс или смешанный профиль, либо ситуацию, когда разные стратегии выражены одинаково сильно.<br><br>
            <i>Это не ошибка и не «плохой результат». Такой профиль говорит о гибкости или неопределённости стратегии в текущий период жизни. Для точного определения можно обратиться к специалисту для более глубокого анализа.</i>
        </div>
    `;
} else {
    const info = IPL_STYLE_DESCRIPTIONS[iplStyleKey];

    styleHTML += `
        <div style="font-size:1.15em; font-weight:bold; margin-bottom:10px;">
            ${info.title}
        </div>
        <div style="font-size:1.05em; line-height:1.6;">
            ${info.text}
        </div>
    `;
}
styleHTML += `</div>`;
// 2. Стиль
detailsHTML += styleHTML;
//3. ===== АСПЕКТЫ ИПЛ =====
detailsHTML += renderBigScalesBlock(
    "🧩 Аспекты инновационного потенциала",
    [
        { key: "G", value: ipl_aspects.G },
        { key: "A", value: ipl_aspects.A },
        { key: "P", value: ipl_aspects.P }
    ],
    60,
    "rgb(173, 216, 230)",
    {
        G: " Гносеологический аспект (Г) – возможность обнаружения нового и ориентации в нем",
        A: "Аксиологический (А) – возможность адекватной оценки нового явления",
        P: "Праксеологический (П) – возможность эффективно действовать в новой ситуации"
    });
// ===== ТИП ДОМИНИРОВАНИЯ АСПЕКТОВ =====
let aspectArr = [
    { key: "G", val: ipl_aspects.G },
    { key: "A", val: ipl_aspects.A },
    { key: "P", val: ipl_aspects.P }
];
const aspectKeyRU = {
  G: "Г",
  A: "А",
  P: "П"
};
aspectArr.sort((a, b) => b.val - a.val);
// проверка на равенства
let aspectsDefined = true;
if (aspectArr[0].val === aspectArr[1].val || aspectArr[1].val === aspectArr[2].val) {
    aspectsDefined = false;
}
let aspectTypeKeyRU = aspectArr.map(x => aspectKeyRU[x.key]).join("");
const ASPECT_DOMINANCE_INFO = {
    "ПГА": "Доминирующей является возможность к продуктивной инновационной деятельности (П), в качестве субдоминанты и фона выступают, соответственно, возможность к обнаружению новой информации (Г) и адекватной оценке новых явлений (А).",
    "ПАГ": "Доминирующей является возможность к продуктивной инновационной деятельности (П), в качестве субдоминанты и фона выступают, соответственно, возможность к адекватной оценке новых явлений (А) и обнаружению новой информации (Г).",

    "ГАП": "Доминирующей является возможность к обнаружению новой информации (Г), в качестве субдоминанты и фона выступают, соответственно, возможность к адекватной оценке новых явлений (А) и продуктивной инновационной деятельности (П).",
    "ГПА": "Доминирующей является возможность к обнаружению новой информации (Г), в качестве субдоминанты и фона выступают, соответственно, возможность продуктивной инновационной деятельности (П) и к адекватной оценке новых явлений (А).",

    "АПГ": "Доминирующей является возможность к адекватной оценке новых явлений (А), в качестве субдоминанты и фона выступают, соответственно, возможность продуктивной инновационной деятельности (П) и возможность к обнаружению новой информации (Г).",
    "АГП": "Доминирующей является возможность к адекватной оценке новых явлений (А), в качестве субдоминанты и фона выступают, соответственно, возможность к обнаружению новой информации (Г) и продуктивной инновационной деятельности (П)."};
// ===== БЛОК ТИПА ДОМИНИРОВАНИЯ АСПЕКТОВ =====
let aspectTypeHTML = `
<div style="
    margin-top:25px;
    padding:18px;
    border-radius:12px;
    background:var(--surface);
    border:1px solid var(--border);">
    <h2 style="margin-top:0;">🧠 Особенности доминирования инновационных возможностей</h2>`;
// Если аспекты не определены, изменяем стиль фона
if(!aspectsDefined) {
    aspectTypeHTML = aspectTypeHTML.replace('background:var(--surface);', 'background:var(--anon-bg);')
                                   .replace('border:1px solid var(--border);', 'border:1px solid var(--border);');
}
if (!aspectsDefined) {
    
    aspectTypeHTML += `
        <div style="font-size:1.05em;">
            <b>⚠️ Тип доминирования не может быть определён.</b><br><br>
            Значения аспектов оказались равными или слишком близкими, поэтому невозможно однозначно выделить доминирующий, субдоминантный и фоновый компоненты.
            Для точного определения можно обратиться к специалисту для более глубокого анализа.<br><br>
            Это нормальный результат, который просто выходит за рамки автоматической классификации.
        </div>
    `;
} else {
    aspectTypeHTML += `
        <div style="font-size:1.15em; font-weight:bold; margin-bottom:10px;">
            Тип ${aspectTypeKeyRU}
        </div>
        <div style="font-size:1.05em; line-height:1.6;">
            ${ASPECT_DOMINANCE_INFO[aspectTypeKeyRU]}
        </div>
    `;
}
aspectTypeHTML += `</div>`;
detailsHTML += aspectTypeHTML;
//4. ===== УРОВНИ =====
detailsHTML += renderBigScalesBlock(
    "🌍 ИПЛ на уровнях взаимодействия с миром",
    [
        { key: "nature", value: ipl_levels.nature },
        { key: "social", value: ipl_levels.social },
        { key: "culture", value: ipl_levels.culture },
        { key: "life", value: ipl_levels.life }
    ],
    45,
    "rgb(144, 238, 144)",
    {
        nature: "Природный (средовой)",
        social: "Социальный",
        culture: "Культурный",
        life: "Организация собственной жизни"
    });
document.getElementById("detailsIPL").innerHTML = detailsHTML;
        // ========================================
        // === СОХРАНЕНИЕ ДАННЫХ ДЛЯ ЭКСПОРТА  ===
        // =======================================
        // Функция для разбора строки вида "<span...>Заголовок</span> Описание"
        const parseResultText = (htmlString) => {
            if (!htmlString) return { title: "Не определено", desc: "" };
            
            // Пытаемся вытащить текст из тега (например, <span>Стенический</span>)
            const spanMatch = htmlString.match(/<span[^>]*>(.*?)<\/span>/);
            const title = spanMatch ? spanMatch[1] : "Результат";
            
            // Очищаем HTML теги, чтобы получить чистое описание
            let tmp = document.createElement("DIV");
            tmp.innerHTML = htmlString;
            let fullText = tmp.innerText || tmp.textContent || "";
            
            // Описание - это весь текст минус Заголовок
            let desc = fullText.replace(title, "").trim();
            // Убираем возможные "—" или "-" в начале описания
            desc = desc.replace(/^[—\-]\s*/, ""); 
            
            return { title, desc };
        };
        const clean = (t) => {
            let d = document.createElement("div"); d.innerHTML = t || "";
            return d.innerText.trim();
        };
        // Разбираем тексты Мильмана
        const milmanMot = parseResultText(motivationTypeText);
        const milmanEmo = parseResultText(emoTypeText);
        window.FULL_REPORT_CACHE = {
            ready: true,
            bratus: {
                rows: bratusExportRows,
                desc: clean(document.getElementById('detailsBratus').innerHTML)
            },
            milman: {
                // Данные
                scores: m_scores,
                emo: emo,
                graphs: { 
                    labels: scales_names, 
                    life_ideal: life_ideal_data, life_real: life_real_data, 
                    work_ideal: work_ideal_data, work_real: work_real_data,
                    total_ideal: integral_ideal_data, total_real: integral_real_data 
                },
                // Тексты (Теперь строго соответствуют экрану)
                motType: milmanMot.title,
                motDesc: milmanMot.desc,
                emoType: milmanEmo.title,
                emoDesc: milmanEmo.desc
            },
            ipl: {
                sum: ipl_sum,
                level: ipl_level,
                desc: clean(ipl_text),
                aspects: ipl_aspects,
                types: ipl_types,
                levels: ipl_levels, // Тут nature, social и т.д.
                
                // Доминирование (Г, А, П)
                domDefined: aspectsDefined, // Флаг логики
                domType: aspectTypeKeyRU,
                domDesc: clean(ASPECT_DOMINANCE_INFO[aspectTypeKeyRU]),
                
                // Стиль
                styleDefined: iplStyleDefined, // Флаг из логики
                styleTitle: (IPL_STYLE_DESCRIPTIONS[iplStyleKey] || {}).title || "",
                styleDesc: (IPL_STYLE_DESCRIPTIONS[iplStyleKey] || {}).text || ""
            }
        };
        console.log("CACHE SAVED FIXED!", window.FULL_REPORT_CACHE);
// ======================================================================
    }, immediate ? 0 : 2000);
// --- ДОПОЛНЕНИЕ: Расчет профиля для сфер Жизнь и Работа ---
        const spheresToProcess = [
        { scores: m_scores.life.ideal, elementId: 'textMilmanLife', label: 'Жизнь' },
        { scores: m_scores.work.ideal, elementId: 'textMilmanWork', label: 'Работа / Учёба' }
    ];
    spheresToProcess.forEach(sphere => {
        let s = sphere.scores;
        let s_develop = (s.D || 0) + (s.DR || 0) + (s.OD || 0);
        let s_maintain = (s.P || 0) + (s.K || 0) + (s.S || 0);
        let s_diff = s_develop - s_maintain;
        let s_profileText = "";

        if (s_diff >= 5) {
            s_profileText = "<span class='score-badge bg-blue'>Прогрессивный</span> Вы — человек роста. Для вас важнее двигаться вперёд, осваивать новое и развиваться, чем просто сохранять текущее положение дел. Это качество часто ведёт к успеху в работе и учёбе.";
        } else if (s_diff <= -5) {
            s_profileText = "<span class='score-badge bg-blue'>Регрессивный</span> Для вас главное — стабильность, комфорт и сохранение того, что уже есть. Мотивы «оставить всё как есть» обычно сильнее, чем желание рисковать и меняться. Это может приводить к застою.";
        } else {
            const scales = ['P','K','S','O','D','DR','OD'];
            let values = scales.map(sc => s[sc] || 0);
            let peaks = 0;
            for(let i=0; i<values.length; i++) {
                let v = values[i];
                if(i===0) { if(v >= values[1]+4) peaks++; }
                else if(i===values.length-1) { if(v >= values[values.length-2]+4) peaks++; }
                else { if(v >= values[i-1]+2 && v >= values[i+1]+2) peaks++; }
            }
            if (peaks >= 3) {
                s_profileText = "<span class='score-badge bg-blue'>Импульсивный</span> Ваша мотивация — это внутренние качели. У вас одновременно есть несколько очень сильных, но разных и даже противоречивых желаний. Из-за этого ваши интересы и энергия могут часто и резко переключаться.";
            } else if (peaks === 2) {
                s_profileText = "<span class='score-badge bg-blue'>Экспрессивный</span> У вас чёткие приоритеты: вы ярко выделяете что-то важное для себя как в сфере комфорта, так и в сфере достижений. Вы стремитесь к самоутверждению и любите, когда ваши успехи и особенности замечают другие.";
            } else {
                s_profileText = "<span class='score-badge bg-blue'>Уплощенный</span> У вас нет ярко выраженных «вершин» или «провалов» среди мотивов — все они выражены примерно одинаково. Это может означать, что пока нет чётких жизненных приоритетов или внутренняя картина желаний недостаточно ясна.";
            }
        }
        document.getElementById(sphere.elementId).innerHTML = `<div><b>Тип мотивационного профиля (${sphere.label}):</b> ${s_profileText}</div>`;
    });
  // --------------------------------------------------------------------------
    // Новые методики (регистрируются в js/registry.js)
    if (typeof runResultHooks === 'function') runResultHooks();
}
// Утилиты
function switchStep(f, t) { document.getElementById(f).classList.remove('active'); setTimeout(() => document.getElementById(t).classList.add('active'), 200); window.scrollTo(0,0); updateProgress(); }
// --- DEV TOOL: Автозаполнение текущего экрана ---
function devAutoFill() {
    // Ищем активный шаг (экран, который сейчас видит пользователь)
    const activeStep = document.querySelector('.step.active');
    if (!activeStep) return;
    if (activeStep.id === 'step-econ') { devFillEconPage(); return; }   // экономический опросник: случайные ответы на текущем экране
    
    // 1. Если мы на Братусе (там чекбоксы, и нужно выбрать ровно 3)
    if (activeStep.id === 'step-bratus') {
        const checkboxes = activeStep.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false); // Сбрасываем, если что-то уже нажато
        
        // Выбираем 3 случайных и КЛИКАЕМ по ним
        let shuffled = Array.from(checkboxes).sort(() => 0.5 - Math.random());
        shuffled.slice(0, 3).forEach(cb => cb.click());
        console.log(`[DEV] Братусь: заполнено 3 варианта.`);
        return;
    }

    // 2. Для Мильмана и ИПЛ (радиокнопки, по одной в каждой группе)
    const radios = activeStep.querySelectorAll('input[type="radio"]');
    const names = [...new Set(Array.from(radios).map(r => r.name))];
    
    names.forEach(name => {
        const group = activeStep.querySelectorAll(`input[name="${name}"]`);
        if(group.length > 0) {
            const randomIdx = Math.floor(Math.random() * group.length);
            
            // ПРАВКА ЗДЕСЬ: Используем .click() вместо .checked = true
            // Это заставит браузер думать, что кликнул живой человек, и сработает вся валидация!
            group[randomIdx].click();
        }
    });
    console.log(`[DEV] Автоматически заполнено ${names.length} вопросов.`);
}
// проверщик полноты ответов
function validateGroup(prefix, c1, c2) {
    let err = null; let cont = prefix==='m'?state.milman:state.ipl;
    if(c2===1) { for(let i=0;i<c1;i++) if(!cont[i]) { err=document.getElementById('row_ipl_'+i); err.classList.add('highlight-error'); break; } }
    else { for(let q=0;q<c1;q++) for(let i=0;i<c2;i++) if(cont[`${q}_${i}`]===undefined) { err=document.getElementById(`row_m_${q}_${i}`); err.classList.add('highlight-error'); break; } }
    if(err) { err.scrollIntoView({behavior:"smooth", block:"center"}); document.getElementById(prefix==='m'?'milman-error':'ipl-error').style.display='block'; return false; }
    return true;}