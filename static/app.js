let wordLen = 5;
let lang = 'en';
let keyMap = { gray: '1', yellow: '2', green: '3' };
let selectedIndex = 0;
let statuses = [];

const lettersEl = document.getElementById('letters');
const suggestionsEl = document.getElementById('suggestions');

function createTiles() {
    lettersEl.innerHTML = '';
    statuses = Array(wordLen).fill(0); // 0=clear,1=gray,2=yellow,3=green
    for (let i = 0; i < wordLen; i++) {
        const div = document.createElement('div');
        div.classList.add('letter', 'status-0');
        div.dataset.idx = i;
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.dataset.idx = i;
        input.addEventListener('click', (e) => {
            selectedIndex = i;
            input.focus();
        });
        input.addEventListener('input', (e) => {
            // accept only letters
            const v = input.value;
            input.value = v ? v[0].toLowerCase() : '';
            // move cursor to next tile automatically
            if (input.value && i < wordLen - 1) {
                const next = lettersEl.querySelector(`[data-idx='${i+1}'] input`);
                if (next) next.focus();
            }
            // if user entered the last letter – return focus to the first tile to start painting
            if (input.value && i === wordLen - 1) {
                const first = lettersEl.querySelector("[data-idx='0'] input");
                if (first) { first.focus(); selectedIndex = 0; }
            }
        });
        input.addEventListener('keydown', (e) => onTileKeydown(e, i));
        div.appendChild(input);
        lettersEl.appendChild(div);
    }
    updateTiles();
    const first = lettersEl.querySelector("[data-idx='0'] input");
    if (first) first.focus();
    syncEnteredHistoryWidth();
    // after tiles are created, ensure history scroll is at bottom so the latest entry sits closest to tiles
    const ent = document.getElementById('entered_history');
    if (ent) ent.scrollTop = ent.scrollHeight;
}

function syncEnteredHistoryWidth(){
    const entered = document.getElementById('entered_history');
    const letters = document.getElementById('letters');
    if (!entered || !letters) return;
    // set exact width to match the letters container so rows are centered above the tiles
    const w = letters.offsetWidth;
    entered.style.width = w + 'px';
}

function cycleStatus(i, value=null) {
    if (value === null) {
        statuses[i] = (statuses[i] + 1) % 4;
    } else {
        statuses[i] = value;
    }
    updateTiles();
}

function updateTiles(){
    for (let i=0;i<wordLen;i++){
        const container = lettersEl.querySelector(`[data-idx='${i}']`);
        const tile = container.querySelector('input');
        container.className = 'letter status-' + statuses[i];
    }
}

// Ensure global number key mapping when focus is not inside a tile
window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'Tab') return;
    if (key >= '0' && key <= '9') {
        const active = document.activeElement;
        if (active && (active.tagName.toLowerCase() === 'input' && active.parentElement && active.parentElement.classList.contains('letter'))) {
            // let the input's handler do the work
            return;
        }
        const mapVal = Object.entries(keyMap).find(([k,v]) => v === key);
        if (!mapVal) return;
        const status = mapVal[0] === 'gray' ? 1 : mapVal[0] === 'yellow' ? 2 : 3; // 3 -> green
        cycleStatus(selectedIndex, status);
        // move to next tile
        if (selectedIndex < wordLen - 1) {
            const next = lettersEl.querySelector(`[data-idx='${selectedIndex+1}'] input`);
            if (next) { next.focus(); selectedIndex = selectedIndex + 1; }
        } else {
            // If we are at the last tile, wrap to the first tile so user can begin coloring
            const first = lettersEl.querySelector("[data-idx='0'] input");
            if (first) { first.focus(); selectedIndex = 0; }
        }
        e.preventDefault();
    }
});

// keyboard mapping
function onTileKeydown(e, idx){
    const key = e.key;
    if (key === 'Enter') {
        submitGuess();
        e.preventDefault();
        return;
    }
    if (key === 'Backspace') {
        const input = e.target;
        if (input.value === '' && idx > 0) {
            const prev = lettersEl.querySelector(`[data-idx='${idx-1}'] input`);
            if (prev) { prev.focus(); prev.value = ''; }
        }
        setTimeout(() => updateTiles(), 0);
        return;
    }
    if (key === 'ArrowLeft' && idx > 0) {
        const prev = lettersEl.querySelector(`[data-idx='${idx-1}'] input`);
        if (prev) prev.focus();
        e.preventDefault();
        return;
    }
    if (key === 'ArrowRight' && idx < wordLen - 1) {
        const next = lettersEl.querySelector(`[data-idx='${idx+1}'] input`);
        if (next) next.focus();
        e.preventDefault();
        return;
    }

    // map numbers to statuses
    if (key >= '0' && key <= '9') {
        const mapVal = Object.entries(keyMap).find(([k,v]) => v === key);
        if (!mapVal) return;
        const status = mapVal[0] === 'gray' ? 1 : mapVal[0] === 'yellow' ? 2 : 3;
        cycleStatus(idx, status);
        // if user colored tile while focused, move to next tile, or wrap to first if at last
        if (idx < wordLen - 1) {
            const next = lettersEl.querySelector(`[data-idx='${idx+1}'] input`);
            if (next) { next.focus(); selectedIndex = idx + 1; }
        } else {
            const first = lettersEl.querySelector("[data-idx='0'] input");
            if (first) { first.focus(); selectedIndex = 0; }
        }
        e.preventDefault();
        return;
    }
}

lettersEl.addEventListener('click', (e) => {
    const target = e.target.closest('.letter');
    if (!target) return;
    selectedIndex = parseInt(target.dataset.idx);
    const input = target.querySelector('input');
    if (input) input.focus();
});

// Suggestion rendering
function renderSuggestions(words){
    suggestionsEl.innerHTML = '';
    for (let i=0;i<words.length;i++){
        const [w, p] = words[i];
        const div = document.createElement('div');
        div.className = 'suggestion';
        const left = document.createElement('div');
        left.className = 'left';
        left.style.cursor = 'pointer';
        left.setAttribute('role', 'button');
        left.setAttribute('tabindex', '0');
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.textContent = w;
        left.appendChild(wordSpan);
        left.addEventListener('click', () => {
            // fill tiles with clicked word
            for (let i=0;i<wordLen;i++){
                const a = lettersEl.querySelector(`[data-idx='${i}'] input`);
                if (a) a.value = w[i] || '';
            }
            statuses = Array(wordLen).fill(0);
            updateTiles();
            const first = lettersEl.querySelector("[data-idx='0'] input");
            if (first) first.focus();
        });
        left.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                left.click();
            }
        });
        const right = document.createElement('div');
        const prob = document.createElement('span');
        prob.className = 'prob';
        prob.textContent = p + '%';
        right.appendChild(prob);
        const btn = document.createElement('button');
        btn.className = 'danger';
        btn.textContent = 'X';
        btn.addEventListener('click', () => {
            const persist = document.getElementById('persist_checkbox')?.checked;
            if (persist) {
                if (!confirm(`Удалить слово '${w}' из банка навсегда?`)) return;
            }
            excludeWord(w, persist);
        });
        right.appendChild(btn);
        div.appendChild(left);
        div.appendChild(right);
        suggestionsEl.appendChild(div);
    }
}

// API calls
async function newGame(){
    wordLen = parseInt(document.getElementById('word_len').value);
    lang = document.getElementById('lang').value;
    createTiles();
    const res = await fetch('/api/init', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({words_len: wordLen, lang})
    });
    const json = await res.json();
    if (json.ok){
        renderSuggestions(json.words);
            // clear entered history on new game
            const entered = document.getElementById('entered_history');
            if (entered) entered.innerHTML = '';
    } else {
        alert('Ошибка: ' + json.error);
    }
}

async function refreshSuggestions(){
    const res = await fetch('/api/analyze');
    const json = await res.json();
    if (json.ok) renderSuggestions(json.words);
}

async function submitGuess(){
    // collect chars from tiles
    let w = '';
    for (let i=0;i<wordLen;i++){
        const a = lettersEl.querySelector(`[data-idx='${i}'] input`);
        w += (a && a.value) ? a.value.toLowerCase() : '';
    }
    if (w.length !== wordLen || w.includes(' ')) { alert('Длина слова должна быть ' + wordLen + ' и заполнены все буквы'); return; }
    if (statuses.some(s => s === 0)) { alert('Пожалуйста, покрасьте все буквы цветом (1/2/3) перед отправкой.'); return; }
    const res = await fetch('/api/guess', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({word:w, statuses: statuses})});
    const json = await res.json();
    if (json.ok){
        renderSuggestions(json.words);
        if (json.word) {
            addGuessAboveInput(json.word, statuses, json.result);
        }
        // show result mapping returned by server if present (also included in history block)
        // clear the tiles to allow new word input
        for (let i=0;i<wordLen;i++){
            const a = lettersEl.querySelector(`[data-idx='${i}'] input`);
            if (a) a.value = '';
        }
        statuses = Array(wordLen).fill(0);
        selectedIndex = 0;
        updateTiles();
        const first = lettersEl.querySelector("[data-idx='0'] input");
        if (first) first.focus();
    } else alert(json.error);
}

// Removed: addGuessToHistory - we no longer show entered words on right-side.

function addGuessAboveInput(word, statuses, result){
    const container = document.getElementById('entered_history');
    if (!container) return;
    syncEnteredHistoryWidth();
    const row = document.createElement('div');
    row.className = 'entered-guess-row';
    for (let i=0;i<wordLen;i++){
        const letter = document.createElement('div');
        const s = statuses[i] || 0;
        letter.className = 'entered-guess-letter status-' + s;
        letter.textContent = (word[i] || '').toUpperCase();
        row.appendChild(letter);
    }
    // Do not show textual 'ryg' result; colors convey status
    container.appendChild(row);
    // Keep scroll pinned to bottom so the newest entries are visible directly above the tiles
    container.scrollTop = container.scrollHeight;
}

async function excludeWord(word, persist=false){
    const res = await fetch('/api/exclude', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({word, persist})});
    const json = await res.json();
    if (json.ok) renderSuggestions(json.words);
}

// Buttons
document.getElementById('new_game').addEventListener('click', newGame);
document.getElementById('word_len').addEventListener('change', (e) => {
    wordLen = parseInt(e.target.value);
    createTiles();
});
document.getElementById('submit').addEventListener('click', submitGuess);
document.getElementById('clear').addEventListener('click', () => {
    for (let i=0;i<wordLen;i++){
        const a = lettersEl.querySelector(`[data-idx='${i}'] input`);
        if (a) a.value = '';
    }
    statuses = Array(wordLen).fill(0);
    updateTiles();
    const first = lettersEl.querySelector("[data-idx='0'] input");
    if (first) first.focus();
});

// Keymap inputs
function updateKeyMap(){
    keyMap.gray = document.getElementById('key_gray').value || '1';
    keyMap.yellow = document.getElementById('key_yellow').value || '2';
    keyMap.green = document.getElementById('key_green').value || '3';
}
['key_gray','key_yellow','key_green'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateKeyMap);
});

// init on load
createTiles();
newGame();

// keep the entered history in sync with letters width on resize
window.addEventListener('resize', syncEnteredHistoryWidth);
