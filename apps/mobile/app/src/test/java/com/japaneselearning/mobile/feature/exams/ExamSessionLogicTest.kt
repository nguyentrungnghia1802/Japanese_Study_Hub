package com.japaneselearning.mobile.feature.exams

import com.japaneselearning.mobile.data.model.GradedOption
import com.japaneselearning.mobile.data.model.GradedQuestion
import org.junit.Assert.assertEquals
import org.junit.Test

class ExamSessionLogicTest {
    @Test
    fun `timer and navigation stay bounded`() {
        assertEquals(0, ExamSessionLogic.previousIndex(0))
        assertEquals(2, ExamSessionLogic.nextIndex(1, 3))
        assertEquals(2, ExamSessionLogic.nextIndex(9, 3))
        assertEquals(59L, ExamSessionLogic.remainingSeconds(61_000L, 2_000L))
        assertEquals("01:05", ExamSessionLogic.formatTimer(65))
    }

    @Test
    fun `answered count ignores unanswered entries`() {
        assertEquals(
            2,
            ExamSessionLogic.answeredCount(
                mapOf("q1" to "a1", "q2" to null, "q3" to "", "q4" to "a4"),
            ),
        )
    }

    @Test
    fun `submitted review filters distinguish wrong and unanswered questions`() {
        val questions = listOf(
            GradedQuestion("q1", "one", "a", "b", false, options()),
            GradedQuestion("q2", "two", null, "b", false, options()),
            GradedQuestion("q3", "three", "c", "c", true, options()),
        )

        assertEquals(listOf(true, false, false), questions.map { ReviewFilterLogic.matches(ReviewFilter.WRONG, it) })
        assertEquals(listOf(false, true, false), questions.map { ReviewFilterLogic.matches(ReviewFilter.UNANSWERED, it) })
        assertEquals(listOf(true, true, true), questions.map { ReviewFilterLogic.matches(ReviewFilter.ALL, it) })
    }

    @Test
    fun `review lookup query is trimmed and bounded for safe navigation`() {
        assertEquals("Question text", ExamSessionLogic.lookupQuery("  Question text  "))
        assertEquals(120, ExamSessionLogic.lookupQuery("x".repeat(140)).length)
    }

    private fun options() = listOf(
        GradedOption("a", "A", false),
        GradedOption("b", "B", true),
        GradedOption("c", "C", false),
    )
}
