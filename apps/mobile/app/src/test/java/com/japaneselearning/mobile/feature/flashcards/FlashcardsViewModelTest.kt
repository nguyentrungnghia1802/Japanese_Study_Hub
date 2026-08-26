package com.japaneselearning.mobile.feature.flashcards

import com.japaneselearning.mobile.data.cache.CachedDashboardEntity
import com.japaneselearning.mobile.data.cache.CachedExamEntity
import com.japaneselearning.mobile.data.cache.CachedFlashcardSetEntity
import com.japaneselearning.mobile.data.cache.CachedRecentLearningEntity
import com.japaneselearning.mobile.data.cache.StudyReadCache
import com.japaneselearning.mobile.data.cache.StudyReadCacheDao
import com.japaneselearning.mobile.data.model.*
import com.japaneselearning.mobile.data.repository.StudyRepository
import java.io.IOException
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
class FlashcardsViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() { Dispatchers.setMain(dispatcher) }

    @After
    fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `retains cached library when remote refresh fails`() = runTest(dispatcher) {
        val cache = StudyReadCache(FakeStudyReadCacheDao()).also {
            it.saveFlashcardSets(
                listOf(FlashcardSet("set-1", "Cached set", "cached", 1, false)),
            )
        }

        val viewModel = FlashcardsViewModel(FailingStudyRepository(), cache)
        advanceUntilIdle()

        assertEquals(listOf("set-1"), viewModel.state.value.screen.data?.map { it.id })
        assertTrue(viewModel.state.value.screen.isStale)
        assertEquals("offline", viewModel.state.value.screen.error)
    }
}

private class FailingStudyRepository : StudyRepository {
    override suspend fun listFlashcardSets(search: String?, favoriteOnly: Boolean, tag: String?): List<FlashcardSet> =
        throw IOException("offline")

    override suspend fun listTags(): List<LearningTag> = emptyList()

    override suspend fun login(username: String, password: String): User = error("unused")
    override suspend fun me(): User = error("unused")
    override suspend fun logout() = Unit
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
    override suspend fun listExamFolders(): List<ExamFolder> = emptyList()
    override suspend fun listExams(
        folderId: String?,
        search: String?,
        favoriteOnly: Boolean,
        tag: String?,
    ): List<Exam> = emptyList()
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

private class FakeStudyReadCacheDao : StudyReadCacheDao {
    private val flashcardSets = mutableListOf<CachedFlashcardSetEntity>()
    private val exams = mutableListOf<CachedExamEntity>()
    private val recentLearning = mutableListOf<CachedRecentLearningEntity>()
    private var dashboard: CachedDashboardEntity? = null

    override suspend fun readFlashcardSets() = flashcardSets.toList()
    override suspend fun readExams() = exams.toList()
    override suspend fun readRecentLearning() = recentLearning.toList()
    override suspend fun readDashboard() = dashboard

    override suspend fun insertFlashcardSets(items: List<CachedFlashcardSetEntity>) {
        items.forEach { item ->
            flashcardSets.removeAll { it.id == item.id }
            flashcardSets += item
        }
    }

    override suspend fun insertExams(items: List<CachedExamEntity>) {
        items.forEach { item ->
            exams.removeAll { it.id == item.id }
            exams += item
        }
    }

    override suspend fun insertRecentLearning(items: List<CachedRecentLearningEntity>) {
        items.forEach { item ->
            recentLearning.removeAll { it.entityKey == item.entityKey }
            recentLearning += item
        }
    }

    override suspend fun insertDashboard(item: CachedDashboardEntity) { dashboard = item }
    override suspend fun deleteExpiredFlashcardSets(cutoff: Long) { flashcardSets.removeAll { it.cachedAt < cutoff } }
    override suspend fun deleteExpiredExams(cutoff: Long) { exams.removeAll { it.cachedAt < cutoff } }
    override suspend fun deleteExpiredRecentLearning(cutoff: Long) { recentLearning.removeAll { it.cachedAt < cutoff } }
    override suspend fun trimFlashcardSets() { while (flashcardSets.size > 100) flashcardSets.removeAt(0) }
    override suspend fun trimExams() { while (exams.size > 100) exams.removeAt(0) }
    override suspend fun trimRecentLearning() { while (recentLearning.size > 20) recentLearning.removeAt(0) }
}
