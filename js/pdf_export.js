// ==========================================
// МОДУЛЬ ЭКСПОРТА PDF 
// ==========================================
const txt = (v) => (v !== undefined && v !== null) ? String(v) : '-';
window.exportReportPDF = async function(btnEl) {
    const btn = btnEl || (typeof event !== 'undefined' && event ? event.currentTarget : null);
    if(btn) { btn.innerText = "⏳ Подготовка..."; btn.disabled = true; }
    try {
        // Загружаем логотип (Асинхронно!)
        const logoBase64 = await getImageDataUrl('icons/icon-128.png');
        if(!window.FULL_REPORT_CACHE || !window.FULL_REPORT_CACHE.ready) 
            throw new Error("Данные еще не готовы. Подождите пару секунд.");
        const CACHE = window.FULL_REPORT_CACHE;
        const timestamp = new Date().toLocaleDateString();
        // КОЭФФИЦИЕНТ КАЧЕСТВА (2 = Retina, 3 = Print)
        // 2 достаточно для четкого текста, 3 может вызвать зависание на слабых ПК
        const SCALE = 2; 
        // Плагин для цифр (Адаптирован под масштаб)
        const valPlugin = { 
            id: 'val', 
            afterDatasetsDraw(c){ 
                const ctx=c.ctx; ctx.save(); 
                // Шрифт увеличиваем пропорционально масштабу
                ctx.font = `bold ${22 * SCALE}px Roboto`; 
                ctx.fillStyle='#000000'; ctx.textAlign='center';
                c.data.datasets.forEach((d,i)=>{ 
                    c.getDatasetMeta(i).data.forEach((b,idx)=>{ 
                        if(d.data[idx]!=null) {
                            let isHoriz = c.config.options.indexAxis==='y';
                            // Отступы тоже умножаем на SCALE
                            let x = b.x + (isHoriz ? (15 * SCALE) : 0);
                            let y = b.y + (isHoriz ? (4 * SCALE) : (-8 * SCALE));
                            ctx.fillText(d.data[idx], x, y); 
                        }
                    })
                }); 
                ctx.restore();
            } };
        // Базовые настройки шрифтов для всех графиков
        const commonOpts = {
            animation: false,
            responsive: false,
            layout: { padding: { right: 35 * SCALE, top: 15 * SCALE } },
            // Увеличиваем базовый шрифт, чтобы на большой картинке он не был мелким
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { font: { size: 15 * SCALE, weight: 'bold' } } },
                y: { ticks: { font: { size: 15 * SCALE, weight: 'bold' } } }
            }};
        // --- ГЕНЕРАЦИЯ ГРАФИКОВ (ПО ОЧЕРЕДИ) ---
        if(btn) btn.innerText = "⏳ Генерация Графика 1/9";
        // Братусь
        // Кастомный плагин для Братуся тоже адаптируем под SCALE
        const bratusPlugin = {
            id: 'brVal', afterDatasetsDraw(c){ 
                const ctx=c.ctx; ctx.save(); ctx.font=`bold ${16 * SCALE}px Roboto`; ctx.fillStyle='#000'; 
                c.getDatasetMeta(0).data.forEach((b,i)=>{ ctx.fillText(CACHE.bratus.rows[i].sum, b.x + (10 * SCALE), b.y + (4 * SCALE)); }); 
                ctx.restore(); 
            }};
        const cBr = await generateChart({ 
            type: 'bar', 
            data: { labels: CACHE.bratus.rows.map(r=>r.name), datasets: [{ data: CACHE.bratus.rows.map(r=>25-r.sum), backgroundColor: CACHE.bratus.rows.map(r=>r.sum<=9?'#27ae60':r.sum<=17?'#2980b9':'#e74c3c') }] }, 
            options: { ...commonOpts, indexAxis: 'y', scales: { x:{display:false, max:24}, y:{grid:{display:false}, ticks:{font:{size: 12 * SCALE, weight:'bold'}}} } }, 
            plugins: [bratusPlugin] 
        }, 800, 350, SCALE);
        if(btn) btn.innerText = "⏳ Генерация Графика 2/9";
        // Мильман Общий
        const cMil = await generateChart({ 
            type: 'line', 
            data: { labels: CACHE.milman.graphs.labels, datasets: 
                [{ label: 'Идеал', data: CACHE.milman.graphs.total_ideal, borderColor: '#27ae60', fill:true, backgroundColor:'rgba(39,174,96,0.1)', tension:0, borderWidth: 2 * SCALE, pointRadius: 3 * SCALE }, 
                { label: 'Реальность', data: CACHE.milman.graphs.total_real, borderColor: '#e74c3c', fill:true, backgroundColor:'rgba(231,76,60,0.1)', tension:0, borderWidth: 2 * SCALE, pointRadius: 3 * SCALE }] }, 
                options: {
                ...commonOpts,
                scales: { y: { min:0, max:12, ticks:{font:{size: 11 * SCALE}} }, x:{ticks:{font:{size: 12 * SCALE}}} },
                plugins: { legend: { display: true, position: 'top', labels: { font: { size: 14 * SCALE } } } }
            }
        }, 800, 350, SCALE);
        if(btn) btn.innerText = "⏳ Генерация Графика 3/9";
        // Мильман Жизнь
        const cMilL = await generateChart({ 
            type: 'line', 
            data: { labels: CACHE.milman.graphs.labels, datasets: [{ label: 'Идеал', data: CACHE.milman.graphs.life_ideal, borderColor: '#2980b9', tension:0, borderWidth: 2 * SCALE, pointRadius: 3 * SCALE }, { label: 'Реальность', data: CACHE.milman.graphs.life_real, borderColor: '#e74c3c', borderDash:[10,10], tension:0, borderWidth: 2 * SCALE, pointRadius: 3 * SCALE }] }, 
            options: { ...commonOpts, scales: { y: { min:0, max:12, ticks:{font:{size: 11 * SCALE}} }, x:{ticks:{font:{size: 12 * SCALE}}} }, plugins:{legend: { display: true, position: 'top', labels: { font: { size: 14 * SCALE } } },title:{display:true, text:'Жизнь', font:{size: 16 * SCALE}}} } 
        }, 800, 350, SCALE);
        if(btn) btn.innerText = "⏳ Генерация Графика 4/9";
        // Мильман Работа
        const cMilW = await generateChart({ 
            type: 'line', 
            data: { labels: CACHE.milman.graphs.labels, datasets: [{ label: 'Идеал', data: CACHE.milman.graphs.work_ideal, borderColor: '#8e44ad', tension:0, borderWidth: 2 * SCALE, pointRadius: 3 * SCALE }, { label: 'Реальность', data: CACHE.milman.graphs.work_real, borderColor: '#e74c3c', borderDash:[10,10], tension:0, borderWidth: 2 * SCALE, pointRadius: 3 * SCALE }] }, 
            options: { ...commonOpts, scales: { y: { min:0, max:12, ticks:{font:{size: 11 * SCALE}} }, x:{ticks:{font:{size: 12 * SCALE}}} }, plugins:{legend: { display: true, position: 'top', labels: { font: { size: 14 * SCALE } } },title:{display:true, text:'Работа', font:{size: 16 * SCALE}}} } 
        }, 800, 350, SCALE);
        if(btn) btn.innerText = "⏳ Генерация Графика 5/9";
        // Мильман Эмоции
        const cMilE = await generateChart({ 
            type: 'line', 
            data: { labels: ["Обычное состояние", "Стрессовая ситуация"], datasets: [{ label: 'Стенические (активные)', data: [CACHE.milman.emo.E_st, CACHE.milman.emo.F_st], borderColor: '#27ae60', borderWidth: 3 * SCALE, tension:0, pointRadius: 4 * SCALE }, { label: 'Астенические (пассивные)', data: [CACHE.milman.emo.E_ast, CACHE.milman.emo.F_ast], borderColor: '#e74c3c', borderWidth: 3 * SCALE, tension:0, pointRadius: 4 * SCALE }] }, 
            options: {
                ...commonOpts,
                scales: { y: { beginAtZero: true, suggestedMax:12, ticks:{font:{size: 11 * SCALE}} }, x:{ticks:{font:{size: 12 * SCALE}}} },
                plugins: { legend: { display: true, position: 'top', labels: { font: { size: 14 * SCALE } } } }
            }
        }, 600, 300, SCALE);
        if(btn) btn.innerText = "⏳ Генерация Графика 6/9";
        // ИПЛ Общий
        const cIpl = await generateChart({ type: 'bar', data: { labels: ['Общий балл'], datasets: [{ data: [CACHE.ipl.sum], backgroundColor: CACHE.ipl.sum>=95?'#27ae60':'#e74c3c' }] }, options: { ...commonOpts, indexAxis: 'y', scales: { x:{min:0, max:180,ticks: {font:{size: 20*SCALE, weight: 'bold'}}}, y:{display:false} } }, plugins: [valPlugin] }, 1000, 150, SCALE);
        if(btn) btn.innerText = "⏳ Генерация Графика 7/9";
        // Аспекты
        const cIplA = await generateChart({ type: 'bar', data: { labels: ['Гносеологический (Г)', 'Аксиологический (А)', 'Праксеологический (П)'], datasets: [{ data: [CACHE.ipl.aspects.G, CACHE.ipl.aspects.A, CACHE.ipl.aspects.P], backgroundColor: ['#87CEFA', '#90EE90', '#FFD700'] }] }, options: { ...commonOpts, indexAxis: 'y', scales: { x:{beginAtZero:true, max: 60,ticks: {font: { size: 16 * SCALE, weight: 'bold' }}}, y:{ticks:{font:{size: 18 * SCALE, weight:'bold'}}} } }, plugins: [valPlugin] }, 800, 250, SCALE);
        if(btn) btn.innerText = "⏳ Генерация Графика 8/9";
        // Типы
        const cIplT = await generateChart({ type: 'bar', data: { labels: ['Поиск (ОИ vs ФН)', 'Оценка (ПД vs НГ)', 'Действие (ИП vs ВП)'], datasets: [{ label: 'Активный', data: [CACHE.ipl.types.OI, CACHE.ipl.types.PD, CACHE.ipl.types.IP], backgroundColor: '#2ecc71' }, { label: 'Пассивный', data: [CACHE.ipl.types.FN, CACHE.ipl.types.NG, CACHE.ipl.types.VP], backgroundColor: '#95a5a6' }] }, options: { ...commonOpts, indexAxis: 'y', scales: { x:{beginAtZero:true, max: 30,ticks: {font: { size: 16 * SCALE, weight: 'bold' }}}, y:{ticks:{font:{size: 16 * SCALE, weight:'bold'}}} } }, plugins: [valPlugin] }, 800, 300, SCALE);
        if(btn) btn.innerText = "⏳ Генерация Графика 9/9";
        // Уровни
        const cIplL = await generateChart({ type: 'bar', data: { labels: ['Природный', 'Социальный', 'Культурный', 'Жизненный'], datasets: [{ data: [CACHE.ipl.levels.nature, CACHE.ipl.levels.social, CACHE.ipl.levels.culture, CACHE.ipl.levels.life], backgroundColor: '#9b59b6' }] }, options: { ...commonOpts, indexAxis: 'y', scales: { x:{beginAtZero:true, max: 45,ticks: {font: { size: 16 * SCALE, weight: 'bold' }}}, y:{ticks:{font:{size: 18 * SCALE, weight:'bold'}}} } }, plugins: [valPlugin] }, 800, 300, SCALE);
        if(btn) btn.innerText = "⏳ Сборка файла...";
        const tables = buildTablesFromCache(CACHE);
        // Тексты ИПЛ
        const iplDomText = CACHE.ipl.domDefined 
            ? [ {text: `Тип ${CACHE.ipl.domType}`, bold:true, color:'#2980b9'}, {text: CACHE.ipl.domDesc, style:'small'} ]
            : [ {text: "⚠️ Тип доминирования не может быть определён (равные значения).", bold:true, color:'#e74c3c'}, {text: "Значения аспектов оказались равными или слишком близкими.", style:'small'} ];
        const iplStyleText = CACHE.ipl.styleDefined
            ? [ {text: CACHE.ipl.styleTitle, bold:true, color:'#2980b9'}, {text: CACHE.ipl.styleDesc, style:'small'} ]
            : [ {text: "⚠️ Стиль не может быть определён.", bold:true, color:'#e74c3c'}, {text: "В одной или нескольких парах показателей значения оказались равными.", style:'small'} ];
        // Секции новых методик (js/registry.js), по порядку из FLOW
        const extraStart = await pdfExtra('start');
        const extraBratus = await pdfExtra('bratus');
        const extraMilman = await pdfExtra('milman');
        const extraIpl = await pdfExtra('ipl', true);
        // --- PDF ---
        const docDef = {
            content: [
                // ЛОГОТИП И ЗАГОЛОВОК (В ОДНОЙ СТРОКЕ)
                {
                    columns: [
                        ...(logoBase64 ? [{ image: logoBase64, width: 50, height: 50 }] : []),
                        { text: 'Результаты психологического исследования', style: 'header', alignment: 'left', margin: [20, 10, 0, 0] }
                    ],
                    columnGap: 10,
                    margin: [0, 0, 0, 20]
                },
                { text: `Участник: ${state.meta.fio || 'Аноним'} | Дата: ${timestamp}`, style: 'subheader' },
                ...extraStart, 
                // БРАТУСЬ
                { text: blockNum('bratus') + 'Система жизненных смыслов', style: 'h2' },
                { image: cBr, width: 550 },
                { text: 'Таблица 1. Детальные ранги:', margin:[0,10,0,5], bold:true },
                { table: { widths: ['30%', '15%', '15%', '15%', '10%', '15%'], body: tables.bratus }, layout: 'lightHorizontalLines' },
                { text: CACHE.bratus.desc, style:'small', margin:[0,10] },
                { text: '', pageBreak: 'after' },
                ...extraBratus,
                // МИЛЬМАН
                { text: blockNum('milman') + 'Мотивационная структура', style: 'h2' },
                { text: [ {text: 'Тип мотивационного профиля: ', bold:true}, CACHE.milman.motType ] },
                { text: CACHE.milman.motDesc, style: 'small', italics:true, margin:[0,0,0,10] },
                { text: 'Общий профиль:', fontSize:12, bold:true, margin:[0,5] },
                { image: cMil, width: 550, alignment: 'center', },
                
                { text: 'Детальные профили:', margin:[0,15,0,5], bold:true },
                { image: cMilL, width: 550, alignment: 'center', margin:[0,0,0,10] }, 
                { image: cMilW, width: 550, alignment: 'center', margin:[0,0,0,10] }, 

                { text: 'Эмоциональный профиль:', margin:[0,15,0,5], fontSize:12, bold:true },
                { text: [ {text: 'Тип эмоционального профиля: ', bold:true}, CACHE.milman.emoType ] },
                { text: CACHE.milman.emoDesc, style: 'small', italics:true },
                { image: cMilE, width: 550, margin:[0,5] },

                { text: 'Таблица 1. Ключ к тесту (Ответы в баллах):', bold: true, margin: [0,15,0,5] },
                { table: { widths: ['auto', ...Array(7).fill('*')], body: tables.milmanKey1 }, margin: [0,0,0,10] },
                { table: { widths: ['auto', ...Array(7).fill('*')], body: tables.milmanKey2 } },

                { text: 'Таблица 2. Данные профиля:', bold: true, margin: [0,20,0,5] },
                { table: { widths: ['auto', ...Array(9).fill('*')], body: tables.milmanProfile } },
                { text: 'Описание шкал теста', style: 'h3', margin:[0,15,0,5] },
                {
                    text: [
                        {text: 'Шкалы мотивационного профиля:\n', bold:true},
                        '• P - поддержание жизнеобеспечения\n','• К - комфорт\n','• С - социальный статус\n','• О - общение\n','• Д - общая активность\n','• ДР - творческая активность\n','• ОД - общественная полезность\n',
                        {text: 'Подшкалы:\n', bold:true},
                        '• Ож – общежитейская (вся сфера жизнедеятельности)\n','• Рб – рабочая/учебная (только рабочая сфера)\n','• ид – «идеальное» состояние (уровень побуждения)\n', '• ре – «реальное» состояние (оценка удовлетворенности и усилий)\n',
                        
                        {text: 'Шкалы эмоционального профиля:\n', bold:true},
                        '• Эст – стенический тип (активные переживания)\n', '• Эаст – астенический тип (пассивные переживания)\n','• Фст – стенический тип в состоянии фрустрации\n',
                        '• Фаст – астенический тип в состоянии фрустрации'
                    ],
                    style: 'small',
                    lineHeight: 1.3
                },
                { text: '', pageBreak: 'after' },
                ...extraMilman,
                // ИПЛ
                { text: blockNum('ipl') + 'Инновационный потенциал', style: 'h2' },
                { text: [ {text:'Общий уровень: ', bold:true}, `${CACHE.ipl.sum} (${CACHE.ipl.level})` ], fontSize:12 },
                { text: CACHE.ipl.desc, margin:[0,5,0,10], style:'small' },
                { image: cIpl, width: 500 },
                
                { text: 'Аспекты (Г, А, П):', style: 'h3', margin:[0,10] },
                { image: cIplA, width: 500 },
                { text: 'Особенности доминирования:', bold:true, margin:[0,10,0,2] },
                ...iplDomText,

                { text: 'Типы реализации:', style: 'h3', margin:[0,15,0,5] },
                { image: cIplT, width: 500 },
                { text: ' Стиль реализации инновационного потенциала:', bold:true, margin:[0,10,0,2] },
                ...iplStyleText,

                { text: 'ИПЛ на уровнях взаимодействия с миром:', style: 'h3', margin:[0,15,0,5] },
                { image: cIplL, width: 500 },
                { text: 'Таблица 3. Результаты ИПЛ:', bold:true, margin:[0,15,0,5] },
                { table: { body: tables.ipl } },
                ...extraIpl,

                { text: 'Сырые данные (JSON):', style: 'h3' },
                { text: JSON.stringify(state), style: 'code' }
            ],
            styles: {
                header: { fontSize: 24, bold: true, alignment: 'center' },
                subheader: { fontSize: 14, alignment: 'center', color: 'gray' },
                h2: { fontSize: 18, bold: true, margin: [0, 10], color: '#2c3e50', decoration: 'underline' },
                h3: { fontSize: 16, bold: true, margin: [0, 5], color: '#34495e' },
                th: { bold: true, fontSize: 11, fillColor: '#eee', alignment:'center' },
                small: { fontSize: 11, color: '#444' },
                code: { fontSize: 8, font: 'Roboto', background: '#f5f5f5' }
            }
        };
        pdfMake.createPdf(docDef).download(`Result_${state.meta.fio || 'Anon'}.pdf`);
    } catch (err) {
        console.error("PDF Error:", err);
        alert("Ошибка: " + err.message);
    } finally {
        if(btn) { btn.innerText = "📄 Скачать PDF отчет"; btn.disabled = false; }
    }
};
function buildTablesFromCache(CACHE) {
    let brBody = [[ {text:'Категория', style:'th'}, {text:'Утв.1', style:'th'}, {text:'Утв.2', style:'th'}, {text:'Утв.3', style:'th'}, {text:'Сумма', style:'th'}, {text:'Статус', style:'th'} ]];
    CACHE.bratus.rows.forEach(r => {
        brBody.push([
            {text: txt(r.name), fontSize:10}, {text: txt(r.v1), fontSize:10}, {text: txt(r.v2), fontSize:10}, {text: txt(r.v3), fontSize:10},
            {text: txt(r.sum), bold:true, alignment:'center', fontSize:11}, {text: txt(r.status), fontSize:10}
        ]);
    });
    const markers = ["ОжИд", "РбИд", "ОжРе", "РбРе", "ОжИд", "РбИд", "ОжРе", "РбРе", "ОжИд", "РбИд", "ОжРе", "РбРе","Э", "Ф"];
    let k1 = [[{text:'', bold:true}, ...[1,2,3,4,5,6,7].map(i=>({text:i, style:'th'}))]];
    let k2 = [[{text:'', bold:true}, ...[8,9,10,11,12,13,14].map(i=>({text:i, style:'th'}))]];
    ['a','b','c','d','e','f','g','h'].forEach((l, ridx) => {
        let r1 = [{text:l, style:'th'}], r2 = [{text:l, style:'th'}];
        for(let c=0; c<7; c++) r1.push({text: txt(state.milman[`${c}_${ridx}`]), alignment:'center'});
        for(let c=7; c<14; c++) r2.push({text: txt(state.milman[`${c}_${ridx}`]), alignment:'center'});
        k1.push(r1); k2.push(r2);
    });
    let b1 = [{text:'', border:[false,false,false,false]}];
    let b2 = [{text:'', border:[false,false,false,false]}];
    for(let i=0; i<7; i++) b1.push({text: markers[i], color:'red', fontSize:9, alignment:'center', bold:true});
    for(let i=7; i<14; i++) b2.push({text: markers[i], color:'red', fontSize:9, alignment:'center', bold:true});
    k1.push(b1); k2.push(b2);
        // 3. таблица 2
        let mp = [[ {text:'', border:[false,false,false,false]}, {text:'П',style:'th'}, {text:'К',style:'th'}, {text:'С',style:'th'}, {text:'О',style:'th'}, {text:'Д',style:'th'}, {text:'ДР',style:'th'}, {text:'ОД',style:'th'}, {text:'Э',style:'th'}, {text:'Ф',style:'th'} ]];
    const s = CACHE.milman.scores;
    const ord = ['P','K','S','O','D','DR','OD'];
    // Хелпер для получения ячеек П-ОД
    const getSc = (scope, type) => ord.map(k => ({text: txt(s[scope][type][k]), alignment:'center'}));
    // Строка 1: ОжИд (Эст/Фст с объединением вниз)
    mp.push([
        {text:'ОжИд', bold:true}, 
        ...getSc('life','ideal'), 
        {text: txt(CACHE.milman.emo.E_st), rowSpan: 2, alignment:'center', margin:[0,8,0,0]}, // Эст
        {text: txt(CACHE.milman.emo.F_st), rowSpan: 2, alignment:'center', margin:[0,8,0,0]}  // Фст
    ]);
    // Строка 2: ОжРе (Э/Ф пустые, т.к. объединены с верхней)
    mp.push([
        {text:'ОжРе', bold:true}, 
        ...getSc('life','real'), 
        {}, {} ]);
    // Строка 3: РбИд (Эаст/Фаст с объединением вниз)
    mp.push([
        {text:'РбИд', bold:true}, 
        ...getSc('work','ideal'), 
        {text: txt(CACHE.milman.emo.E_ast), rowSpan: 2, alignment:'center', margin:[0,8,0,0]}, // Эаст
        {text: txt(CACHE.milman.emo.F_ast), rowSpan: 2, alignment:'center', margin:[0,8,0,0]}  // Фаст
    ]);
    // Строка 4: РбРе (Э/Ф пустые)
    mp.push([
        {text:'РбРе', bold:true}, 
        ...getSc('work','real'), 
        {}, {} 
    ]);
    let iplT = [
        [{text:'Шкала', style:'th'}, {text:'Балл', style:'th'}],
        ['Общий балл', txt(CACHE.ipl.sum)],
        ['Гносеологический (Г)', txt(CACHE.ipl.aspects.G)], ['Аксиологический (А)', txt(CACHE.ipl.aspects.A)], ['Праксеологический (П)', txt(CACHE.ipl.aspects.P)],
        ['Тип: ОИ (Поиск)', txt(CACHE.ipl.types.OI)], ['Тип: ФН (Поиск)', txt(CACHE.ipl.types.FN)],
        ['Тип: ПД (Оценка)', txt(CACHE.ipl.types.PD)], ['Тип: НГ (Оценка)', txt(CACHE.ipl.types.NG)],
        ['Тип: ИП (Действие)', txt(CACHE.ipl.types.IP)], ['Тип: ВП (Действие)', txt(CACHE.ipl.types.VP)],
        ['Уровень: Природный', txt(CACHE.ipl.levels.nature)], 
        ['Уровень: Социальный', txt(CACHE.ipl.levels.social)],
        ['Уровень: Культурный', txt(CACHE.ipl.levels.culture)], 
        ['Уровень: Жизненный', txt(CACHE.ipl.levels.life)]
    ];
    return { bratus: brBody, milmanKey1: k1, milmanKey2: k2, milmanProfile: mp, ipl: iplT };
}
// ГЕНЕРАТОР ГРАФИКОВ (HI-RES с МАСШТАБИРОВАНИЕМ)
function generateChart(config, w, h, scale = 2) {
    return new Promise(resolve => {
        const cvs = document.createElement('canvas'); 
        // Физический размер увеличиваем в SCALE раз
        cvs.width = w * scale; 
        cvs.height = h * scale; 
        const ctx = cvs.getContext('2d');
        const cfg = JSON.parse(JSON.stringify(config));
        // Фон
        cfg.plugins = config.plugins || [];
        cfg.plugins.unshift({ id:'bg', beforeDraw:(c)=>{ const x=c.canvas.getContext('2d'); x.save(); x.globalCompositeOperation='destination-over'; x.fillStyle='white'; x.fillRect(0,0,c.width,c.height); x.restore(); } });
        // Отключаем devicePixelRatio (он вызывает глюки в headless), но размер Canvas уже большой!
        cfg.options = cfg.options || {}; 
        cfg.options.animation = false; 
        cfg.options.responsive = false;
        cfg.options.devicePixelRatio = 1; // Принудительно 1, чтобы Chart.js рисовал пиксель в пиксель
        try { 
            const chart = new Chart(ctx, cfg); 
            setTimeout(() => { 
                resolve(chart.toBase64Image('image/png', 1.0)); 
                chart.destroy(); 
            }, 300); 
        } catch(e) { resolve(null); }
    });
}
// Функция для загрузки картинки в Base64
function getImageDataUrl(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null); // Если картинки нет, вернем null
        img.src = url;
    });
}