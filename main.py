from ui import UI
from words_uploader import upload_russian, upload_english


WORDS_LEN = 5


def main() -> None:
    ui = UI(WORDS_LEN)
    lang = ui.choose_language()
    ui.set_words(upload_russian(WORDS_LEN) if lang == 'ru' else upload_english())
    ui.start()


if __name__ == '__main__':
    main()
