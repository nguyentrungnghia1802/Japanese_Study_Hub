package com.japaneselearning.mobile.feature.lookup

import com.japaneselearning.mobile.data.model.DashboardSummary
import com.japaneselearning.mobile.data.model.DictionaryLookup
import com.japaneselearning.mobile.data.model.DictionarySuggestions
import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.ExamFolder
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.FlashcardReviewQueue
import com.japaneselearning.mobile.data.model.FlashcardReviewRating
import com.japaneselearning.mobile.data.model.FlashcardReviewResult
import com.japaneselearning.mobile.data.model.FlashcardReviewSummary
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.LearningTag
import com.japaneselearning.mobile.data.model.LiveAttempt
import com.japaneselearning.mobile.data.model.SearchResults
import com.japaneselearning.mobile.data.model.User
import com.japaneselearning.mobile.data.model.WrongAnswerReviewQueue
import com.japaneselearning.mobile.data.repository.StudyRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DictionaryViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `blocked lookup never schedules dictionary reads or suggestions`() = runTest(dispatcher) {
        val repository = FakeDictionaryRepository()
        val viewModel = DictionaryViewModel(repository)
        advanceUntilIdle()

        viewModel.setLookupBlocked(true)
        viewModel.setQuery("日本語")
        viewModel.lookup()
        advanceUntilIdle()

        assertTrue(viewModel.state.value.isBlocked)
        assertEquals(0, repository.lookupCalls)
        assertEquals(0, repository.suggestionCalls)
    }
}

private class FakeDictionaryRepository : StudyRepository {
    var lookupCalls = 0
    var suggestionCalls = 0

    override suspend fun dictionaryLookup(
        query: String,
        direction: com.japaneselearning.mobile.data.model.DictionaryLookupDirection,
        limit: Int,
        includeExamples: Boolean,
    ): DictionaryLookup {
        lookupCalls += 1
        error("unused")
    }

    override suspend fun dictionarySuggestions(
        query: String,
        direction: com.japaneselearning.mobile.data.model.DictionaryLookupDirection,
        limit: Int,
    ): DictionarySuggestions {
        suggestionCalls += 1
        error("unused")
    }

    override suspend fun login(username: String, password: String): User = error("unused")
    override suspend fun me(): User = error("unused")
    override suspend fun logout() = Unit
    override suspend fun listFlashcardSets(search: String?, favoriteOnly: Boolean, tag: String?) = emptyList<FlashcardSet>()
    override suspend fun getFlashcardSet(setId: String): FlashcardSet = error("unused")
    override suspend fun getFlashcardReviewSummary(): FlashcardReviewSummary = error("unused")
    override suspend fun getFlashcardReviewQueue(limit: Int): FlashcardReviewQueue = error("unused")
    override suspend fun submitFlashcardReview(
        cardId: String,
        rating: FlashcardReviewRating,
        clientRequestId: String,
    ): FlashcardReviewResult = error("unused")
    override suspend fun setFlashcardFavorite(setId: String, favorite: Boolean): FlashcardSet = error("unused")
    override suspend fun setFlashcardTags(setId: String, tags: List<String>): FlashcardSet = error("unused")
    override suspend fun listTags(): List<LearningTag> = emptyList()
    override suspend fun listExamFolders(): List<ExamFolder> = emptyList()
    override suspend fun listExams(folderId: String?, search: String?, favoriteOnly: Boolean, tag: String?) = emptyList<Exam>()
    override suspend fun getExam(examId: String): Exam = error("unused")
    override suspend fun setExamFavorite(examId: String, favorite: Boolean): Exam = error("unused")
    override suspend fun setExamTags(examId: String, tags: List<String>): Exam = error("unused")
    override suspend fun startAttempt(examId: String): LiveAttempt = error("unused")
    override suspend fun getAttempt(attemptId: String): LiveAttempt = error("unused")
    override suspend fun saveAnswer(attemptId: String, questionId: String, selectedOptionId: String?) = Unit
    override suspend fun submitAttempt(attemptId: String, answers: Map<String, String?>): ExamResult = error("unused")
    override suspend fun startMistakePractice(examId: String, mistakeIds: List<String>): LiveAttempt = error("unused")
    override suspend fun getWrongAnswerReviewQueue(limit: Int): WrongAnswerReviewQueue = error("unused")
    override suspend fun dismissWrongAnswer(mistakeId: String) = Unit
    override suspend fun clearWrongAnswers(examId: String?) = Unit
    override suspend fun getDashboard(): DashboardSummary = error("unused")
    override suspend fun search(query: String): SearchResults = error("unused")
}
