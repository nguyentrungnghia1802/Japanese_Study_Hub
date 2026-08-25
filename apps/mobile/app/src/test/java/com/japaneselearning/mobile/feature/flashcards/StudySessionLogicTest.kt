package com.japaneselearning.mobile.feature.flashcards

import com.japaneselearning.mobile.data.model.Flashcard
import org.junit.Assert.assertEquals
import org.junit.Test

class StudySessionLogicTest {
    @Test
    fun `progress and navigation are deterministic`() {
        assertEquals("2 / 3", StudySessionLogic.progress(1, 3))
        assertEquals(2, StudySessionLogic.nextIndex(1, 3))
        assertEquals(0, StudySessionLogic.previousIndex(0))
    }

    @Test
    fun `shuffle keeps every card`() {
        val cards = listOf(
            Flashcard("1", "set", "日", "ひ", 0),
            Flashcard("2", "set", "月", "つき", 1),
            Flashcard("3", "set", "火", "ひ", 2),
        )
        assertEquals(cards.map { it.id }.toSet(), StudySessionLogic.shuffled(cards, 42).map { it.id }.toSet())
    }
}
