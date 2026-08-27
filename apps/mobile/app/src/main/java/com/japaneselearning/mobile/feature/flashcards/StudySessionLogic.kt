package com.japaneselearning.mobile.feature.flashcards

import com.japaneselearning.mobile.data.model.Flashcard

object StudySessionLogic {
    const val MAX_SAVED_CARD_IDS = 500

    fun nextIndex(current: Int, size: Int): Int =
        if (size == 0) 0 else (current + 1).coerceAtMost(size - 1)

    fun previousIndex(current: Int): Int = (current - 1).coerceAtLeast(0)

    fun progress(index: Int, size: Int): String =
        if (size == 0) "0 / 0" else "${index + 1} / $size"

    fun shuffled(cards: List<Flashcard>, seed: Long): List<Flashcard> =
        cards.shuffled(kotlin.random.Random(seed))

    /**
     * Replays a saved order only when it is a complete permutation of the
     * server response. A changed/deleted set must start from the server order
     * instead of silently dropping or inventing cards.
     */
    fun restoreOrder(savedIds: List<String>?, cards: List<Flashcard>): List<Flashcard>? {
        if (savedIds == null || savedIds.size != cards.size || savedIds.size > MAX_SAVED_CARD_IDS) return null
        if (savedIds.toSet().size != savedIds.size) return null
        val cardsById = cards.associateBy { it.id }
        if (cardsById.size != cards.size || cardsById.keys != savedIds.toSet()) return null
        return savedIds.mapNotNull(cardsById::get)
    }
}
