function downloadJSON() { 
    const fn = `Res_${state.meta.fio.replace(/[^а-яА-Яa-zA-Z0-9]/g,'_')}.json`; 
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: "application/json"}); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); }

function copyResult() { 
    let txt = document.getElementById('result-area'); 
    txt.style.display = 'block'; 
    txt.select(); 
    document.execCommand('copy'); 
    document.getElementById('copy-msg').style.display = 'block'; }

// --- ЛОГИКА МОДАЛЬНОГО ОКНА ЗАГРУЗКИ ---
// Показываем окно
function showUserImportModal() {
    document.getElementById('user-import-modal').style.display = 'flex';
}
// Скрываем окно
function hideUserImportModal() {
    document.getElementById('user-import-modal').style.display = 'none';
    // Сбрасываем сообщение об ошибке при закрытии
    document.getElementById('user-import-error').innerText = ''; 
}
// Центральная функция для обработки JSON (из файла или текста)
function processUserJSON(jsonString) {
    const errorDiv = document.getElementById('user-import-error');
    try {
        let data = JSON.parse(jsonString);
        // Проверяем, что в файле есть необходимые данные
        if (data.bratus && data.milman && data.ipl && data.meta) {
            state = data;
            saveStateToLocal();
            // Скрываем модальное окно перед переходом
            hideUserImportModal(); 
            // Переходим к показу результатов (true = не отправлять на сервер)
            finishSurvey(true);
        } else {
            errorDiv.innerText = "Ошибка: Неверный или поврежденный файл.";
        }
    } catch (err) {
        console.error("Ошибка при чтении пользовательского JSON:", err);
        errorDiv.innerText = "Ошибка: Файл не является корректным JSON.";
    }
}
// Функция для обработки вставленного из textarea текста
function processPastedJSON() {
    const text = document.getElementById('user-paste-area').value;
    if (!text.trim()) {
        document.getElementById('user-import-error').innerText = "Поле для текста пустое.";
        return;
    }
    processUserJSON(text);
}
// Инициализация обработчиков событий (Drag-n-Drop и выбор файла)
function initUserImporter() {
    const dropZone = document.getElementById('user-drop-zone');
    const fileInput = document.getElementById('user-file-input');
    // --- Drag and Drop ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    // --- File Input ---
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    // --- Общий обработчик файла ---
    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            processUserJSON(event.target.result);
        };
        reader.readAsText(file);
    }
    // Закрытие по клику на фон
    document.getElementById('user-import-modal').addEventListener('click', (e) => {
        if (e.target.id === 'user-import-modal') {
            hideUserImportModal();
        }
    });
}