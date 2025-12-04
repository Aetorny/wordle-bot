def upload_russian(words_len: int) -> set[str]:
    with open(f'word banks/russian{words_len}.txt', 'r', encoding='utf-8') as f:
        words = set([word.replace('ё', 'е') for word in f.read().split('\n') if len(word) == words_len])
    return words


def upload_english() -> set[str]:
    with open('word banks/english.txt', 'r', encoding='utf-8') as f:
        words = set([word for word in f.read().split('\n') if len(word) == 5])
    return words
