package com.japaneselearning.mobile.feature.auth

import com.japaneselearning.mobile.core.storage.TokenStore
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() { Dispatchers.setMain(dispatcher) }

    @After
    fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `login persists session and updates authenticated state`() = runTest(dispatcher) {
        val tokenStore = FakeTokenStore()
        val viewModel = AuthViewModel(FakeRepository(tokenStore), tokenStore)
        advanceUntilIdle()

        viewModel.login("admin", "secret")
        advanceUntilIdle()

        assertEquals("admin", viewModel.state.value.user?.username)
        assertEquals("token", tokenStore.readToken())
    }

    @Test
    fun cachedUsernameOpensSessionBeforeRemoteVerificationCompletes() = runTest(dispatcher) {
        val tokenStore = FakeTokenStore(initialToken = "token", initialUsername = "cached-user")
        val verification = CompletableDeferred<Unit>()
        val viewModel = AuthViewModel(FakeRepository(tokenStore, verification), tokenStore)

        runCurrent()

        assertEquals(false, viewModel.state.value.isLoading)
        assertEquals("cached-user", viewModel.state.value.user?.username)

        verification.complete(Unit)
        advanceUntilIdle()
        assertEquals("admin", viewModel.state.value.user?.username)
    }
}

private class FakeTokenStore(
    initialToken: String? = null,
    initialUsername: String? = null,
) : TokenStore {
    private val value = MutableStateFlow(initialToken)
    private var username: String? = initialUsername
    override val token: Flow<String?> = value
    override suspend fun readToken(): String? = value.value
    override suspend fun saveSession(token: String, username: String) {
        value.value = token
        this.username = username
    }
    override suspend fun readUsername(): String? = username
    override suspend fun clear() { value.value = null; username = null }
}

private class FakeRepository(
    private val tokenStore: TokenStore,
    private val meBlock: CompletableDeferred<Unit>? = null,
) : StudyRepository {
    override suspend fun login(username: String, password: String): User {
        tokenStore.saveSession("token", username)
        return User(username)
    }
    override suspend fun me(): User {
        meBlock?.await()
        return User("admin")
    }
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
    override suspend fun search(query: String): SearchResults = error("unused")
}
