from typing import Any
from flask import Blueprint, render_template, request, jsonify
from config import Config
from services import game_store, WordRepository

api = Blueprint('api', __name__)


@api.route('/')
def index():
    return render_template('index.html')


@api.route('/api/init', methods=['POST'])
def api_init():
    data: dict[str, Any] = request.json or {}
    words_len = int(data.get('words_len', 5))
    lang = data.get('lang', 'en')

    session_id, words = game_store.create_session(lang, words_len)
    
    return jsonify({
        'ok': True, 
        'words': words, 
        'session_id': session_id
    })


def get_current_session():
    """Хелпер для получения сессии из заголовка"""
    session_id = request.headers.get('X-Session-ID', '')
    session = game_store.get_session(session_id)
    return session


@api.route('/api/analyze', methods=['GET'])
def api_analyze():
    session = get_current_session()
    if not session:
        return jsonify({'ok': False, 'error': 'Session expired or invalid'}), 401
        
    words = session.ui.analyze_next_word()
    return jsonify({'ok': True, 'words': words})


@api.route('/api/guess', methods=['POST'])
def api_guess():
    session = get_current_session()
    if not session:
        return jsonify({'ok': False, 'error': 'Session expired or invalid'}), 401

    data: dict[str, Any] = request.json or {}
    word = data.get('word', '')
    statuses = data.get('statuses', [])

    if not word or len(word) != session.ui.words_len:
        return jsonify({'ok': False, 'error': 'Invalid word length'})
    
    if isinstance(statuses, str):
        statuses = list(statuses)
        
    if len(statuses) != session.ui.words_len:
        return jsonify({'ok': False, 'error': 'Invalid statuses length'})

    try:
        result_str = ''.join(Config.STATUS_MAP[s] for s in statuses)
    except KeyError:
        return jsonify({'ok': False, 'error': 'Statuses must be 1, 2, or 3'})

    session.ui.analyze_result(word, result_str)
    words = session.ui.analyze_next_word()
    
    return jsonify({'ok': True, 'word': word, 'words': words, 'result': result_str})


@api.route('/api/exclude', methods=['POST'])
def api_exclude():
    session = get_current_session()
    if not session:
        return jsonify({'ok': False, 'error': 'Session expired or invalid'}), 401

    data: dict[str, Any] = request.json or {}
    word = data.get('word', '')
    persist = bool(data.get('persist', False))

    if not word:
        return jsonify({'ok': False, 'error': 'No word provided'})

    game_store.exclude_word_from_session(session, word)

    if persist:
        WordRepository.remove_word_permanently(word, session.lang, session.words_len)

    # Получаем новые подсказки
    words = session.ui.analyze_next_word()
    return jsonify({'ok': True, 'words': words})
