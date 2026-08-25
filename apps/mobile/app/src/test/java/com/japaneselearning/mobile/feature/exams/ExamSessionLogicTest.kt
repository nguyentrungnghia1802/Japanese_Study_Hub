package com.japaneselearning.mobile.feature.exams

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
}
