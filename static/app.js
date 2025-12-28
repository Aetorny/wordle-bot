// Состояние приложения
const state = {
    sessionId: null,
    wordLen: 5,
    lang: 'en',
    wordsBank: [],
    statuses: [], // Массив чисел: 1 (gray), 2 (yellow), 3 (green)
    keyMap: { gray: '1', yellow: '2', green: '3' }
};

// DOM Элементы
const els = {
    letters: document.getElementById('letters'),
    suggestions: document.getElementById('suggestions'),
    history: document.getElementById('entered_history'),
    loading: document.getElementById('loading_indicator'),
    wordLen: document.getElementById('word_len'),
    lang: document.getElementById('lang'),
    persist: document.getElementById('persist_checkbox'),
    keys: {
        gray: document.getElementById('key_gray'),
        yellow: document.getElementById('key_yellow'),
        green: document.getElementById('key_green')
    }
};

// --- API Helper ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.sessionId) {
        headers['X-Session-ID'] = state.sessionId;
    }
    
    try {
        els.loading.classList.remove('hidden');
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        
        const res = await fetch(endpoint, options);
        if (res.status === 401) {
            showToast('Сессия истекла. Начинаем новую игру...', 'error');
            return await initGame(); 
        }
        const data = await res.json();
        return data;
    } catch (e) {
        showToast('Ошибка сети', 'error');
        console.error(e);
        return null;
    } finally {
        els.loading.classList.add('hidden');
    }
}

// --- Инициализация ---
async function initGame() {
    // Сброс UI
    state.wordLen = parseInt(els.wordLen.value);
    state.lang = els.lang.value;
    createTiles();
    els.history.innerHTML = '';
    
    // Запрос к серверу
    const data = await apiCall('/api/init', 'POST', {
        words_len: state.wordLen, 
        lang: state.lang
    });

    if (data && data.ok) {
        state.sessionId = data.session_id; // ВАЖНО: Сохраняем ID сессии
        renderSuggestions(data.words);
        showToast('Новая игра начата', 'success');
    } else {
        showToast(data?.error || 'Ошибка инициализации', 'error');
    }
}

// --- Логика Тайлов ---
function createTiles() {
    els.letters.innerHTML = '';
    state.statuses = Array(state.wordLen).fill(0); // 0 = пусто/нет цвета
    
    for (let i = 0; i < state.wordLen; i++) {
        const div = document.createElement('div');
        div.className = 'tile status-0';
        div.dataset.idx = i;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.dataset.idx = i;
        
        // События
        input.addEventListener('click', () => input.select());
        input.addEventListener('input', (e) => handleInput(e, i));
        input.addEventListener('keydown', (e) => handleKeydown(e, i));
        
        div.appendChild(input);
        els.letters.appendChild(div);
    }
    
    // Фокус на первое поле
    setTimeout(() => els.letters.querySelector('input')?.focus(), 50);
}

function handleInput(e, idx) {
    const input = e.target;
    const val = input.value;
    
    // Оставляем только буквы
    if (!val.match(/^[a-zA-Zа-яА-ЯёЁ]$/)) {
        input.value = '';
        return;
    }
    
    // Авто-переход к следующему
    if (idx < state.wordLen - 1) {
        const next = els.letters.querySelector(`input[data-idx="${idx + 1}"]`);
        next.focus();
    }
}

function handleKeydown(e, idx) {
    const key = e.key;
    const input = e.target;

    // Навигация Backspace
    if (key === 'Backspace') {
        if (input.value === '' && idx > 0) {
            e.preventDefault();
            const prev = els.letters.querySelector(`input[data-idx="${idx - 1}"]`);
            prev.focus();
            prev.value = ''; // Удаляем букву в предыдущем
            // Сбрасываем статус
            updateStatus(idx - 1, 0); 
        } else {
            // Если есть буква, она удалится сама, мы просто сбрасываем статус
            updateStatus(idx, 0);
        }
    }
    
    // Навигация стрелками
    if (key === 'ArrowLeft' && idx > 0) els.letters.querySelector(`input[data-idx="${idx - 1}"]`).focus();
    if (key === 'ArrowRight' && idx < state.wordLen - 1) els.letters.querySelector(`input[data-idx="${idx + 1}"]`).focus();
    
    // Enter
    if (key === 'Enter') submitGuess();

    // Цвета по цифрам
    if (['1', '2', '3'].includes(key)) {
        e.preventDefault();
        // Маппинг клавиши на статус (вдруг пользователь переназначил)
        // Но здесь мы используем прямую логику: нажал 1 -> серый
        const statusMap = { [state.keyMap.gray]: 1, [state.keyMap.yellow]: 2, [state.keyMap.green]: 3 };
        const s = statusMap[key];
        
        if (s) {
            updateStatus(idx, s);
            // Авто-переход если есть буква
            if (input.value && idx < state.wordLen - 1) {
                els.letters.querySelector(`input[data-idx="${idx + 1}"]`).focus();
            }
        }
    }
}

function updateStatus(idx, status) {
    state.statuses[idx] = status;
    const div = els.letters.querySelector(`div[data-idx="${idx}"]`);
    div.className = `tile status-${status}`;
}

// Глобальный перехват нажатий для раскраски, если фокус не в инпуте
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    // Проверяем, какой инпут был последним активным или берем первый
    // В данной реализации упростим: работаем только если пользователь кликает на тайлы
});

// --- Сабмит ---
async function submitGuess() {
    const inputs = Array.from(els.letters.querySelectorAll('input'));
    const word = inputs.map(i => i.value).join('').toLowerCase();

    // Валидация
    if (word.length !== state.wordLen) {
        return showToast(`Введите слово из ${state.wordLen} букв`, 'error');
    }
    
    // Проверка заполненности статусов (0 запрещен для заполненных букв)
    // Но логика игры Wordle: ты вводишь слово, нажимаешь Enter, потом красишь? 
    // Или красишь сразу? В твоем коде - красишь сразу.
    if (state.statuses.some(s => s === 0)) {
        return showToast('Раскрасьте все буквы (клавиши 1, 2, 3)', 'error');
    }

    const data = await apiCall('/api/guess', 'POST', {
        word: word,
        statuses: state.statuses
    });

    if (data && data.ok) {
        addToHistory(word, state.statuses);
        renderSuggestions(data.words);
        clearInputs();
    } else {
        showToast(data?.error || 'Ошибка', 'error');
    }
}

function addToHistory(word, statuses) {
    const row = document.createElement('div');
    row.className = 'history-row';
    
    for (let i = 0; i < state.wordLen; i++) {
        const tile = document.createElement('div');
        tile.className = `history-tile status-${statuses[i]}`;
        tile.textContent = word[i];
        row.appendChild(tile);
    }
    
    els.history.appendChild(row);
    els.history.scrollTop = els.history.scrollHeight;
}

function clearInputs() {
    const inputs = els.letters.querySelectorAll('input');
    inputs.forEach(inp => inp.value = '');
    state.statuses.fill(0);
    inputs.forEach((_, i) => updateStatus(i, 0));
    inputs[0].focus();
}

// --- Предложения (Suggestions) ---
function renderSuggestions(words) {
    els.suggestions.innerHTML = '';
    if (!words || words.length === 0) {
        els.suggestions.innerHTML = '<div style="color:var(--text-muted); padding:10px">Нет вариантов</div>';
        return;
    }

    words.forEach(([w, prob]) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        const left = document.createElement('div');
        left.innerHTML = `<span class="s-word">${w}</span>`;
        left.onclick = () => fillWord(w);
        
        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        
        right.innerHTML = `
            <span class="s-prob">${prob}%</span>
            <button class="btn-del" title="Исключить">✕</button>
        `;
        
        right.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            excludeWord(w);
        });

        item.appendChild(left);
        item.appendChild(right);
        els.suggestions.appendChild(item);
    });
}

function fillWord(word) {
    const inputs = els.letters.querySelectorAll('input');
    for (let i = 0; i < state.wordLen; i++) {
        inputs[i].value = word[i] || '';
        // Сброс цвета при вставке нового слова
        updateStatus(i, 0); 
    }
    inputs[0].focus();
}

async function excludeWord(word) {
    const persist = els.persist.checked;
    if (persist && !confirm(`Удалить "${word}" из словаря НАВСЕГДА?`)) return;

    const data = await apiCall('/api/exclude', 'POST', { word, persist });
    if (data && data.ok) {
        renderSuggestions(data.words);
        showToast(`Слово "${word}" исключено`);
    }
}

// --- Утилиты ---
function showToast(msg, type = 'success') {
    const cont = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    cont.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- Listeners ---
els.newGameBtn = document.getElementById('new_game');
els.submitBtn = document.getElementById('submit');
els.clearBtn = document.getElementById('clear');

els.newGameBtn.addEventListener('click', initGame);
els.submitBtn.addEventListener('click', submitGuess);
els.clearBtn.addEventListener('click', clearInputs);
els.wordLen.addEventListener('change', () => initGame()); // Смена длины = новая игра

// Настройка кнопок
['key_gray', 'key_yellow', 'key_green'].forEach(id => {
    const inp = document.getElementById(id);
    inp.addEventListener('input', (e) => {
        const key = id.split('_')[1]; // gray/yellow/green
        state.keyMap[key] = e.target.value;
    });
});

// Start
initGame();