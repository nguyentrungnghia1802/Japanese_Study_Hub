package com.japaneselearning.mobile.feature.flashcards

import com.japaneselearning.mobile.data.model.Flashcard

object StudySessionLogic {
    fun nextIndex(current: Int, size: Int): Int =
        if (size == 0) 0 else (current + 1).coerceAtMost(size - 1)

    fun previousIndex(current: Int): Int = (current - 1).coerceAtLeast(0)

    fun progress(index: Int, size: Int): String =
        if (size == 0) "0 / 0" else "${index + 1} / $size"

    fun shuffled(cards: List<Flashcard>, seed: Long): List<Flashcard> =
        cards.shuffled(kotlin.random.Random(seed))
}
