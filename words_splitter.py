from collections import defaultdict
import pymorphy3

def main() -> None:
    m = pymorphy3.MorphAnalyzer()
    words: dict[int, set[str]] = defaultdict(set)
    with open('russianall.txt', 'r') as f:
        for line in f:
            word = line.strip().replace('-', '').replace('.', '').replace(' ', '')
            if not word[0].isupper() and len(word) >= 4 and len(word) <= 11:
                if word.endswith(("ние", "ение", "вание", "ание", "тие")):
                    continue
                parse = m.parse(word)[0]
                if 'PRTF' in parse.tag or 'PRTS' in parse.tag or 'ADJF' in parse.tag or 'ADJS' in parse.tag:
                    continue
                w = parse.inflect({'nomn', 'sing'})
                if w is not None:
                    word = w.word
                    parse = m.parse(word)[0]
                    if 'PRTF' in parse.tag or 'PRTS' in parse.tag or 'ADJF' in parse.tag or 'ADJS' in parse.tag:
                        continue
                    if word.endswith(("ние", "ение", "вание", "ание", "тие")):
                        continue
                words[len(word)].add(word)
    for i in range(4, 12):
        with open(f'russian{i}.txt', 'w') as f:
            for word in words[i]:
                f.write(word + '\n')


if __name__ == '__main__':
    main()
