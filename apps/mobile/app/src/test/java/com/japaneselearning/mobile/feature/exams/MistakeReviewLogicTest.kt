package com.japaneselearning.mobile.feature.exams

import com.japaneselearning.mobile.data.model.RetainedMistakeItem
import com.japaneselearning.mobile.data.model.RetainedMistakeOption
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MistakeReviewLogicTest {
    private val wrong = item(selected = "wrong", unanswered = false)
    private val unanswered = item(selected = null, unanswered = true)

    @Test
    fun filtersWrongAndUnansweredUsingServerState() {
        val items = listOf(wrong, unanswered)

        assertEquals(listOf(wrong), MistakeReviewLogic.visibleItems(items, MistakeReviewFilter.WRONG))
        assertEquals(listOf(unanswered), MistakeReviewLogic.visibleItems(items, MistakeReviewFilter.UNANSWERED))
        assertEquals(items, MistakeReviewLogic.visibleItems(items, MistakeReviewFilter.ALL))
    }

    @Test
    fun createsConciseEditableCardWithoutOptionList() {
        val draft = MistakeReviewLogic.flashcardDraft(wrong)

        assertEquals("Prompt", draft.front)
        assertEquals("Đáp án đúng: Correct\nĐã chọn: Wrong", draft.back)
        assertTrue(draft.back.contains("Correct"))
        assertTrue(!draft.back.contains("Another"))
    }

    private fun item(selected: String?, unanswered: Boolean) = RetainedMistakeItem(
        id = "mistake",
        examId = "exam",
        examTitle = "N3",
        examVersion = 1,
        questionId = "question",
        questionType = "MULTIPLE_CHOICE_SINGLE",
        questionContent = "Prompt",
        questionPosition = 0,
        options = listOf(
            RetainedMistakeOption("correct", "Correct", 0, true),
            RetainedMistakeOption("wrong", "Wrong", 1, false),
            RetainedMistakeOption("another", "Another", 2, false),
        ),
        selectedOptionId = selected,
        correctOptionId = "correct",
        isCorrect = false,
        isUnanswered = unanswered,
        sourceAttemptId = "attempt",
        submittedAt = "2026-08-27T00:00:00Z",
    )
}
