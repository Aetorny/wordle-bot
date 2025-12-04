def analyze_words(words: set[str], words_len: int) -> list[list[tuple[str, int]]]:
    place: list[dict[str, int]] = [dict() for _ in range(words_len)]
    for word in words:
        word = word.strip()
        for i in range(len(word)):
            place[i][word[i]] = place[i].get(word[i], 0) + 1

    place_sorted = [sorted(place[i].items(), key=lambda x: x[1], reverse=True) for i in range(words_len)]

    return place_sorted
