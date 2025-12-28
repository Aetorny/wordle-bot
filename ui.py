from collections import defaultdict
from typing import Generator, Literal
from analyze import analyze_words


class UI:
    def __init__(self, words_len: int) -> None:
        self.words_len = words_len

        self.words: set[str]
        self.initial_words: set[str]
        self.letters_place: list[list[tuple[str, int]]]

        self.letters_must_place: list[str | None] = [None]*self.words_len
        self.in_place_not_letter: list[list[str]] = [[] for _ in range(self.words_len)]
        
        self.dont_use_letters: set[str] = set()
        self.must_be_letters: set[str] = set()

        self.reverse_construct = False

    def get_start_words(self) -> None:
        self.words_starts: dict[int, set[str]] = defaultdict(set)
        for word in self.words:
            for i in range(1, self.words_len):
                self.words_starts[i].add(word[:i])

    def set_words(self, words: set[str]) -> None:
        self.words = words
        self.initial_words = words
        self.letters_place = analyze_words(words, self.words_len)
        self.get_start_words()
        self.initial_words_starts = self.words_starts

    def choose_language(self) -> Literal['ru', 'en']:
        option = input('Выберите язык отгадывания.\n\t1. Русский\n\t2. Английский\n:')
        if option == '1':
            print('Выбран русский язык.')
            return 'ru'
        print('Выбран по умолчанию английский язык.')

        return 'en'

    def construct_word(self, word: str = '', score: int = 0, idx: int = 0) -> Generator[tuple[str, int]]:
        if idx != self.words_len and (idx == 0 or word in self.words_starts[idx]):
            for l, s in self.letters_place[idx]:
                check = self.letters_must_place[idx] is not None and self.letters_must_place[idx] != l
                if not self.reverse_construct and check: continue
                if l in self.in_place_not_letter[idx]: continue
                if l in self.dont_use_letters: continue
                yield from self.construct_word(word + l, score + s, idx + 1)
        else:
            yield (word, score)

    def analyze_next_word(self) -> list[tuple[str, float]]:
        words: list[tuple[str, float]] = []
        sum_ = 0
        for word, score in self.construct_word():
            if word not in self.words:
                continue
            if len(set(word)) != self.words_len:
                score //= 2
            sum_ += score
            words.append((word, score))
        
        new_words: list[tuple[str, float]] = []
        if len(self.must_be_letters) > 0 and len(words) > 1:
            self.letters_place = analyze_words(self.initial_words, self.words_len)
            temp = self.words_starts
            self.words_starts = self.initial_words_starts
            temp_sum = sum_
            sum_ = 0
            self.reverse_construct = True
            for word, score in self.construct_word():
                if word not in self.words:
                    continue
                if len(set(word)) != self.words_len:
                    score //= 2
                score *= len(words)
                sum_ += score
                new_words.append((word, score))
            self.words_starts = temp
            self.reverse_construct = False
            if len(new_words) == 0:
                sum_ = temp_sum
            else:
                words += new_words
                sum_ += temp_sum

        for i in range(len(words)):
            words[i] = (words[i][0], round(words[i][1] / sum_ * 100, 5))
        
        return sorted(words, key=lambda x: x[1], reverse=True)

    def print_fisrt_words(self, words: list[tuple[str, float]], count: int = 10) -> None:
        print('\tСлово'.ljust(12) + ' | Вероятность')
        for i in range(min(count, len(words))):
            print('\t'+f'{i+1}: {words[i][0]}'.ljust(12) + '| ' + str(words[i][1]) + '%')

    def analyze_result(self, word: str, result: str):
        for i in range(self.words_len):
            if result[i] == 'r' and word.count(word[i]) == 1:
                self.dont_use_letters.add(word[i])
            elif result[i] == 'g':
                self.must_be_letters.add(word[i])
                self.letters_must_place[i] = word[i]
            elif result[i] == 'y':
                self.must_be_letters.add(word[i])
                self.in_place_not_letter[i].append(word[i])

        new_words: set[str] = set()
        for word in self.words:
            for i in range(self.words_len):
                if word[i] in self.dont_use_letters:
                    break
            else:
                if all([True if l in word else False for l in self.must_be_letters]):
                    new_words.add(word)

        self.words = new_words
        self.letters_place = analyze_words(self.words, self.words_len)
        self.get_start_words()

    def start(self) -> None:
        print('Пожалуйста подождите, идёт первый анализ...')
        possible_words = self.analyze_next_word()
        print('Завершено.')
        
        print('Вот первые 10 возможных слов:')
        self.print_fisrt_words(possible_words)

        print('Далее напишите слово, которое вы выбрали. А затем под ним напишите результат под нужной буквой')
        print('(r - серый, буква не используется; y - жёлтый, буква используется, но не на этом месте; g - зелёный, буква используется и на этом месте)')

        while True:
            word = ' '
            result = ' '
            while (len(word) != 0 or len(result)) != 0 and (len(word) != self.words_len or len(result) != self.words_len):
                word = input(  'Слово    : ')
                result = input('Результат: ')
            if len(word) == 0 or len(result) == 0:
                return print('Помощь бота завершена')
            
            if result.count('g') == self.words_len:
                return print('Вы победили!')

            print('Обработка результата... ', end='', flush=True)
            self.analyze_result(word, result)
            print('Завершена.')

            print('Запуск нового анализа...')
            possible_words = self.analyze_next_word()
            print('Завершено.')
            print('Вот самые вероятные слова:')
            self.print_fisrt_words(possible_words)