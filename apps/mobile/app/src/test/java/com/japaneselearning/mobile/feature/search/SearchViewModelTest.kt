package com.japaneselearning.mobile.feature.search

import com.japaneselearning.mobile.data.model.DashboardSummary
import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.ExamFolder
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.FlashcardReviewQueue
import com.japaneselearning.mobile.data.model.FlashcardReviewRating
import com.japaneselearning.mobile.data.model.FlashcardReviewResult
import com.japaneselearning.mobile.data.model.FlashcardReviewSummary
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.LiveAttempt
import com.japaneselearning.mobile.data.model.SearchResults
import com.japaneselearning.mobile.data.model.User
import com.japaneselearning.mobile.data.model.WrongAnswerReviewQueue
import com.japaneselearning.mobile.data.repository.StudyRepository
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SearchViewModelTest {
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
    fun queryChangesAreDebouncedAndObsoleteRequestCannotOverwriteNewerResult() = runTest(dispatcher) {
        val blocked = CompletableDeferred<SearchResults>()
        val repository = FakeSearchRepository(mapOf("古" to blocked))
        val viewModel = SearchViewModel(repository)

        viewModel.setQuery("古")
        advanceTimeBy(299)
        assertEquals(emptyList<String>(), repository.queries)

        advanceTimeBy(1)
        runCurrent()
        assertEquals(listOf("古"), repository.queries)

        viewModel.setQuery("新")
        advanceTimeBy(300)
        advanceUntilIdle()

        assertEquals(listOf("古", "新"), repository.queries)
        assertEquals(1, viewModel.state.value.screen.data?.total)
    }

    @Test
    fun recentQueryCacheAvoidsRepeatRequestAndEvictsOldestEntries() = runTest(dispatcher) {
        val repository = FakeSearchRepository()
        val viewModel = SearchViewModel(repository)

        viewModel.setQuery("日本語")
        advanceTimeBy(300)
        advanceUntilIdle()
        viewModel.setQuery("")
        runCurrent()
        viewModel.setQuery("日本語")
        advanceTimeBy(300)
        advanceUntilIdle()

        assertEquals(listOf("日本語"), repository.queries)

        repeat(5) { index ->
            viewModel.setQuery("")
            runCurrent()
            viewModel.setQuery("query-$index")
            advanceTimeBy(300)
            advanceUntilIdle()
        }
        viewModel.setQuery("")
        runCurrent()
        viewModel.setQuery("日本語")
        advanceTimeBy(300)
        advanceUntilIdle()

        assertEquals(2, repository.queries.count { it == "日本語" })
    }
}

private class FakeSearchRepository(
    private val blockedResults: Map<String, CompletableDeferred<SearchResults>> = emptyMap(),
) : StudyRepository {
    val queries = mutableListOf<String>()

    override suspend fun search(query: String): SearchResults {
        queries += query
        blockedResults[query]?.await()
        return SearchResults(
            flashcardSets = emptyList(),
            flashcards = emptyList(),
            exams = emptyList(),
            folders = emptyList(),
            total = if (query == "新") 1 else 0,
        )
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
    override suspend fun startMistakePractice(examId: String, mistakeIds: List<String>): LiveAttempt = error("unused")
    override suspend fun getWrongAnswerReviewQueue(limit: Int): WrongAnswerReviewQueue = error("unused")
    override suspend fun dismissWrongAnswer(mistakeId: String) = Unit
    override suspend fun clearWrongAnswers(examId: String?) = Unit
    override suspend fun getDashboard(): DashboardSummary = error("unused")
}
