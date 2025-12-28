import os

class Config:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    WORD_BANKS_DIR = os.path.join(BASE_DIR, 'word banks')
    
    STATUS_MAP = {
        '1': 'r', '2': 'y', '3': 'g',
        1: 'r', 2: 'y', 3: 'g'
    }

    @staticmethod
    def get_bank_path(lang: str, length: int) -> str:
        if lang == 'en':
            return os.path.join(Config.WORD_BANKS_DIR, 'english.txt')
        return os.path.join(Config.WORD_BANKS_DIR, f'russian{length}.txt')
