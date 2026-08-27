package com.japaneselearning.mobile.feature.exams

import com.japaneselearning.mobile.data.model.RetainedMistakeItem

enum class MistakeReviewFilter {
    ALL,
    WRONG,
    UNANSWERED,
}

data class MistakeFlashcardDraft(
    val front: String,
    val back: String,
)

object MistakeReviewLogic {
    fun matches(filter: MistakeReviewFilter, item: RetainedMistakeItem): Boolean = when (filter) {
        MistakeReviewFilter.ALL -> true
        MistakeReviewFilter.WRONG -> !item.isUnanswered && item.selectedOptionId != null
        MistakeReviewFilter.UNANSWERED -> item.isUnanswered || item.selectedOptionId == null
    }

    fun visibleItems(
        items: List<RetainedMistakeItem>,
        filter: MistakeReviewFilter,
    ): List<RetainedMistakeItem> = items.filter { matches(filter, it) }

    fun flashcardDraft(item: RetainedMistakeItem): MistakeFlashcardDraft {
        val correct = item.options.firstOrNull { it.id == item.correctOptionId }?.content
            ?: "Chưa có đáp án trong snapshot"
        val selected = item.options.firstOrNull { it.id == item.selectedOptionId }?.content
        val selectedLine = selected?.takeIf { item.selectedOptionId != item.correctOptionId }
            ?.let { "Đã chọn: $it" }
        return MistakeFlashcardDraft(
            front = item.questionContent.take(MAX_CARD_TEXT_LENGTH),
            back = listOfNotNull("Đáp án đúng: $correct", selectedLine)
                .joinToString("\n")
                .take(MAX_CARD_TEXT_LENGTH),
        )
    }

    private const val MAX_CARD_TEXT_LENGTH = 4_000
}
