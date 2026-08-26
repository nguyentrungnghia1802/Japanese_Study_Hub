package com.japaneselearning.mobile.feature.flashcards

import com.japaneselearning.mobile.data.model.FlashcardReviewCard

object ReviewSessionLogic {
    const val MAX_ACTIVE_REVIEW_CARDS = 20

    fun boundedQueue(
        cards: List<FlashcardReviewCard>,
        requestedLimit: Int = MAX_ACTIVE_REVIEW_CARDS,
    ): List<FlashcardReviewCard> = cards.take(requestedLimit.coerceIn(1, MAX_ACTIVE_REVIEW_CARDS))

    fun progress(reviewedCount: Int, remainingCount: Int): Float {
        val total = reviewedCount + remainingCount
        return if (total == 0) 1f else (reviewedCount.toFloat() / total).coerceIn(0f, 1f)
    }

    fun progressLabel(reviewedCount: Int, remainingCount: Int): String =
        "$reviewedCount đã ôn · $remainingCount trong đợt"
}
