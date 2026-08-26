package com.japaneselearning.mobile.feature.auth

import com.japaneselearning.mobile.core.storage.TokenStore
import com.japaneselearning.mobile.data.model.DashboardSummary
import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.ExamFolder
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.LiveAttempt
import com.japaneselearning.mobile.data.model.SearchResults
import com.japaneselearning.mobile.data.model.User
import com.japaneselearning.mobile.data.repository.StudyRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
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
}

private class FakeTokenStore : TokenStore {
    private val value = MutableStateFlow<String?>(null)
    private var username: String? = null
    override val token: Flow<String?> = value
    override suspend fun readToken(): String? = value.value
    override suspend fun saveSession(token: String, username: String) {
        value.value = token
        this.username = username
    }
    override suspend fun readUsername(): String? = username
    override suspend fun clear() { value.value = null; username = null }
}

private class FakeRepository(private val tokenStore: TokenStore) : StudyRepository {
    override suspend fun login(username: String, password: String): User {
        tokenStore.saveSession("token", username)
        return User(username)
    }
    override suspend fun me() = User("admin")
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
    override suspend fun getDashboard(): DashboardSummary = error("unused")
    override suspend fun search(query: String): SearchResults = error("unused")
}
