package com.japaneselearning.mobile.feature.flashcards

import com.japaneselearning.mobile.data.model.DashboardSummary
import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.ExamFolder
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.FlashcardReviewCard
import com.japaneselearning.mobile.data.model.FlashcardReviewQueue
import com.japaneselearning.mobile.data.model.FlashcardReviewRating
import com.japaneselearning.mobile.data.model.FlashcardReviewResult
import com.japaneselearning.mobile.data.model.FlashcardReviewSummary
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.LiveAttempt
import com.japaneselearning.mobile.data.model.SearchResults
import com.japaneselearning.mobile.data.model.User
import com.japaneselearning.mobile.data.repository.StudyRepository
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ReviewViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() { Dispatchers.setMain(dispatcher) }

    @After
    fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `review queue is bounded and failed retry reuses request id`() = runTest(dispatcher) {
        val repository = FakeReviewRepository()
        val viewModel = ReviewViewModel(repository)
        advanceUntilIdle()

        assertEquals(ReviewSessionLogic.MAX_ACTIVE_REVIEW_CARDS, viewModel.state.value.cards.size)
        assertEquals(2, viewModel.state.value.summary?.dueCount)

        val cardId = viewModel.state.value.cards.first().id
        viewModel.flip()
        viewModel.rate(FlashcardReviewRating.GOOD)
        advanceUntilIdle()

        assertEquals(cardId, repository.submittedCardIds.single())
        assertNotNull(viewModel.state.value.actionError)
        assertTrue(viewModel.state.value.isBackVisible)

        viewModel.rate(FlashcardReviewRating.GOOD)
        advanceUntilIdle()

        assertEquals(2, repository.submittedRequestIds.size)
        assertEquals(repository.submittedRequestIds[0], repository.submittedRequestIds[1])
        assertEquals(19, viewModel.state.value.cards.size)
        assertEquals(1, viewModel.state.value.reviewedCount)
        assertFalse(viewModel.state.value.isBackVisible)
    }
}

private class FakeReviewRepository : StudyRepository {
    private val cards = (1..21).map { id -> reviewCard(id.toString()) }
    private var failNextReview = true
    val submittedCardIds = mutableListOf<String>()
    val submittedRequestIds = mutableListOf<String>()

    override suspend fun getFlashcardReviewSummary() = FlashcardReviewSummary(
        serverNow = "2026-08-26T00:00:00.000Z",
        dueCount = 2,
        newCount = 21,
        reviewCount = 0,
    )

    override suspend fun getFlashcardReviewQueue(limit: Int) = FlashcardReviewQueue(
        serverNow = "2026-08-26T00:00:00.000Z",
        cards = cards.take(limit),
    )

    override suspend fun submitFlashcardReview(
        cardId: String,
        rating: FlashcardReviewRating,
        clientRequestId: String,
    ): FlashcardReviewResult {
        submittedCardIds += cardId
        submittedRequestIds += clientRequestId
        if (failNextReview) {
            failNextReview = false
            throw IOException("offline")
        }
        val card = cards.first { it.id == cardId }
        return FlashcardReviewResult(
            cardId = cardId,
            rating = rating,
            stateBefore = card.schedule.state,
            stateAfter = "LEARNING",
            dueAtBefore = card.schedule.dueAt,
            dueAtAfter = "2026-08-26T00:01:00.000Z",
            schedule = card.schedule.copy(state = "LEARNING"),
        )
    }

    override suspend fun login(username: String, password: String): User = error("unused")
    override suspend fun me(): User = error("unused")
    override suspend fun logout() = Unit
    override suspend fun listFlashcardSets(search: String?, favoriteOnly: Boolean, tag: String?) = emptyList<FlashcardSet>()
    override suspend fun getFlashcardSet(setId: String): FlashcardSet = error("unused")
    override suspend fun setFlashcardFavorite(setId: String, favorite: Boolean): FlashcardSet = error("unused")
    override suspend fun setFlashcardTags(setId: String, tags: List<String>): FlashcardSet = error("unused")
    override suspend fun listTags() = emptyList<com.japaneselearning.mobile.data.model.LearningTag>()
    override suspend fun listExamFolders() = emptyList<ExamFolder>()
    override suspend fun listExams(folderId: String?, search: String?, favoriteOnly: Boolean, tag: String?) = emptyList<Exam>()
    override suspend fun getExam(examId: String): Exam = error("unused")
    override suspend fun setExamFavorite(examId: String, favorite: Boolean): Exam = error("unused")
    override suspend fun setExamTags(examId: String, tags: List<String>): Exam = error("unused")
    override suspend fun startAttempt(examId: String): LiveAttempt = error("unused")
    override suspend fun getAttempt(attemptId: String): LiveAttempt = error("unused")
    override suspend fun saveAnswer(attemptId: String, questionId: String, selectedOptionId: String?) = Unit
    override suspend fun submitAttempt(attemptId: String, answers: Map<String, String?>): ExamResult = error("unused")
    override suspend fun startMistakePractice(examId: String, mistakeIds: List<String>) = error("unused")
    override suspend fun getWrongAnswerReviewQueue(limit: Int) = error("unused")
    override suspend fun dismissWrongAnswer(mistakeId: String) = Unit
    override suspend fun clearWrongAnswers(examId: String?) = Unit
    override suspend fun getDashboard(): DashboardSummary = error("unused")
    override suspend fun search(query: String): SearchResults = error("unused")

    private fun reviewCard(id: String) = FlashcardReviewCard(
        id = id,
        setId = "set",
        front = "front $id",
        back = "back $id",
        position = id.toInt(),
        schedule = com.japaneselearning.mobile.data.model.FlashcardSchedule(
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
