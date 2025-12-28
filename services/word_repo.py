import os
from config import Config


class WordRepository:
    @staticmethod
    def remove_word_permanently(word: str, lang: str, length: int) -> bool:
        path = Config.get_bank_path(lang, length)
        
        if not os.path.exists(path):
            return False

        try:
            with open(path, 'r', encoding='utf-8') as f:
                lines = [ln.rstrip('\n') for ln in f]

            target = word.lower().replace('ё', 'е')
            
            new_lines = [
                ln for ln in lines 
                if ln and (ln.lower().replace('ё', 'е') != target)
            ]

            if len(new_lines) == len(lines):
                return False # Слово не найдено

            with open(path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))
            
            return True
        except IOError:
            return False
