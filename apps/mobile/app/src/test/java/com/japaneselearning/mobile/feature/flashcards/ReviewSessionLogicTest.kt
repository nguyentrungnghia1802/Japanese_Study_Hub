package com.japaneselearning.mobile.feature.flashcards

import com.japaneselearning.mobile.data.model.FlashcardReviewCard
import com.japaneselearning.mobile.data.model.FlashcardSchedule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ReviewSessionLogicTest {
    @Test
    fun `active review queue is capped at twenty cards`() {
        val cards = (1..25).map { reviewCard(it.toString()) }

        assertEquals(20, ReviewSessionLogic.boundedQueue(cards).size)
        assertEquals(20, ReviewSessionLogic.boundedQueue(cards, 100).size)
        assertEquals(listOf("1"), ReviewSessionLogic.boundedQueue(cards, 1).map { it.id })
    }

    @Test
    fun `progress is bounded and completion is explicit`() {
        assertEquals(0.5f, ReviewSessionLogic.progress(1, 1))
        assertEquals(1f, ReviewSessionLogic.progress(1, 0))
        assertTrue(ReviewSessionLogic.progressLabel(3, 2).contains("3 đã ôn"))
    }

    private fun reviewCard(id: String) = FlashcardReviewCard(
        id = id,
        setId = "set",
        front = "front $id",
        back = "back $id",
        position = id.toInt(),
        schedule = FlashcardSchedule(
            state = "NEW",
            dueAt = "2026-08-26T00:00:00.000Z",
            stability = null,
            difficulty = null,
            elapsedDays = 0,
            scheduledDays = 0,
            learningSteps = 0,
            reps = 0,
            lapses = 0,
            lastReviewedAt = null,
        ),
    )
}
