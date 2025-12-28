import uuid
from typing import Dict, Optional
from ui import UI
from words_uploader import upload_russian, upload_english
from analyze import analyze_words

class GameSession:
    '''Интерфейс для хранения состояния одной игры'''
    def __init__(self, ui: UI, lang: str, words_len: int):
        self.ui = ui
        self.lang = lang
        self.words_len = words_len


class GameStore:
    def __init__(self):
        self._sessions: Dict[str, GameSession] = {}

    def create_session(self, lang: str, words_len: int) -> tuple[str, list[tuple[str, float]]]:
        """Создает новую игру и возвращает ID сессии и начальные слова."""
        ui_obj = UI(words_len)
        words = upload_russian(words_len) if lang == 'ru' else upload_english()
        ui_obj.set_words(words)
        
        possible_words = ui_obj.analyze_next_word()

        session_id = str(uuid.uuid4())
        self._sessions[session_id] = GameSession(ui_obj, lang, words_len)
        
        return session_id, possible_words

    def get_session(self, session_id: str) -> Optional[GameSession]:
        return self._sessions.get(session_id)

    def exclude_word_from_session(self, session: GameSession, word: str) -> None:
        """Логика исключения слова и пересчета UI"""
        ui = session.ui
        removed = False
        
        if word in ui.words:
            ui.words.discard(word)
            removed = True
        
        if word in ui.initial_words:
            ui.initial_words.discard(word)
            removed = True

        if removed:
            ui.letters_place = analyze_words(ui.words, ui.words_len)
            ui.get_start_words()
            
            try:
                current_words = ui.words
                ui.words = ui.initial_words
                ui.get_start_words()
                ui.initial_words_starts = ui.words_starts
                ui.words = current_words
            except Exception:
                pass


# Глобальный инстанс стора (синглтон)
game_store = GameStore()
