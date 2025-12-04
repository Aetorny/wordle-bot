from flask import Flask, render_template, request, jsonify
from ui import UI
from words_uploader import upload_russian, upload_english
from analyze import analyze_words

app = Flask(__name__)

ui_obj: UI | None = None
last_lang = 'en'
last_words_len = 5


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/init', methods=['POST'])
def api_init():
    global ui_obj
    data = request.json or {}
    words_len = int(data.get('words_len', 5))
    lang = data.get('lang', 'en')

    ui_obj = UI(words_len)
    words = upload_russian(words_len) if lang == 'ru' else upload_english()
    ui_obj.set_words(words)
    # store last chosen language and words_len so we can persist removals if needed
    global last_lang, last_words_len
    last_lang = lang
    last_words_len = words_len

    possible_words = ui_obj.analyze_next_word()
    return jsonify({'ok': True, 'words': possible_words})


@app.route('/api/analyze', methods=['GET'])
def api_analyze():
    global ui_obj
    if ui_obj is None:
        return jsonify({'ok': False, 'error': 'UI not initialized'})
    words = ui_obj.analyze_next_word()
    return jsonify({'ok': True, 'words': words})


@app.route('/api/guess', methods=['POST'])
def api_guess():
    global ui_obj
    if ui_obj is None:
        return jsonify({'ok': False, 'error': 'UI not initialized'})
    data = request.json or {}
    word = data.get('word', '')
    # statuses sent as numbers 1/2/3 -> map to r/y/g
    statuses = data.get('statuses', [])
    if isinstance(statuses, str):
        statuses = list(statuses)

    if not word or not statuses or len(word) != ui_obj.words_len or len(statuses) != ui_obj.words_len:
        return jsonify({'ok': False, 'error': 'Invalid input'})

    # validate statuses: must be 1,2,3 for each letter
    valid_vals = {1, 2, 3, '1', '2', '3'}
    if any(s not in valid_vals for s in statuses):
        return jsonify({'ok': False, 'error': 'Statuses must be 1, 2, or 3 for each letter'})

    map_status = {'1': 'r', '2': 'y', '3': 'g', 1: 'r', 2: 'y', 3: 'g'}
    result = ''.join(map_status.get(s, 'r') for s in statuses)
    ui_obj.analyze_result(word, result)
    words = ui_obj.analyze_next_word()
    return jsonify({'ok': True, 'word': word, 'words': words, 'result': result})


@app.route('/api/exclude', methods=['POST'])
def api_exclude():
    global ui_obj
    if ui_obj is None:
        return jsonify({'ok': False, 'error': 'UI not initialized'})
    data = request.json or {}
    word = data.get('word', '')
    if not word:
        return jsonify({'ok': False, 'error': 'No word provided'})

    # Remove from both the current words and the initial bank so it won't be suggested again
    removed = False
    if word in ui_obj.words:
        ui_obj.words.discard(word)
        removed = True
    if hasattr(ui_obj, 'initial_words') and word in ui_obj.initial_words:
        ui_obj.initial_words.discard(word)
        removed = True

    # recompute arrays used for analysis
    ui_obj.letters_place = analyze_words(ui_obj.words, ui_obj.words_len)
    ui_obj.get_start_words()
    # recompute initial_words_starts for the initial words set
    # temporarily switch to initial words to compute start prefixes
    try:
        temp = ui_obj.words
        ui_obj.words = ui_obj.initial_words
        ui_obj.get_start_words()
        ui_obj.initial_words_starts = ui_obj.words_starts
        ui_obj.words = temp
    except Exception:
        # safe fallback if initial_words missing or something fails
        pass

    # check if persist flag was passed and if we should permanently remove the word from disk
    data = request.json or {}
    persist = bool(data.get('persist', False))
    if persist and removed:
        # remove from corresponding word bank file
        path = 'word banks/english.txt' if last_lang == 'en' else f'word banks/russian{last_words_len}.txt'
        try:
            with open(path, 'r', encoding='utf-8') as f:
                lines = [ln.rstrip('\n') for ln in f]
            # normalize lines (replace 'ё' with 'е') and compare to the word
            new_lines = [ln for ln in lines if ln and (ln.replace('ё', 'е') != word and ln.lower() != word)]
            with open(path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))
        except FileNotFoundError:
            # ignore if bank file missing
            pass

    words = ui_obj.analyze_next_word()
    return jsonify({'ok': True, 'words': words})


if __name__ == '__main__':
    app.run(debug=True)
