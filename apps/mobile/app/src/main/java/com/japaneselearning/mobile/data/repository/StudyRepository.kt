package com.japaneselearning.mobile.data.repository

import com.japaneselearning.mobile.core.network.ApiErrorMapper
import com.japaneselearning.mobile.core.storage.TokenStore
import com.japaneselearning.mobile.data.model.DashboardSummary
import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.ExamFolder
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.LiveAttempt
import com.japaneselearning.mobile.data.model.LearningTag
import com.japaneselearning.mobile.data.model.SearchResults
import com.japaneselearning.mobile.data.model.User
import com.japaneselearning.mobile.data.remote.AnswerDto
import com.japaneselearning.mobile.data.remote.DashboardDto
import com.japaneselearning.mobile.data.remote.ExamDto
import com.japaneselearning.mobile.data.remote.ExamFolderDto
import com.japaneselearning.mobile.data.remote.ExamResultDto
import com.japaneselearning.mobile.data.remote.ExamQuestionDto
import com.japaneselearning.mobile.data.remote.FavoriteRequest
import com.japaneselearning.mobile.data.remote.FlashcardDto
import com.japaneselearning.mobile.data.remote.FlashcardSetDto
import com.japaneselearning.mobile.data.remote.LiveAttemptDto
import com.japaneselearning.mobile.data.remote.SearchResultsDto
import com.japaneselearning.mobile.data.remote.StudyApi
import com.japaneselearning.mobile.data.remote.LoginRequest
import com.japaneselearning.mobile.data.remote.SaveAnswersRequest
import com.japaneselearning.mobile.data.remote.SubmitAttemptRequest
import com.japaneselearning.mobile.data.remote.SetTagsRequest
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CancellationException

interface StudyRepository {
    suspend fun login(username: String, password: String): User

    suspend fun me(): User

    suspend fun logout()

    suspend fun listFlashcardSets(
        search: String? = null,
        favoriteOnly: Boolean = false,
        tag: String? = null,
    ): List<FlashcardSet>

    suspend fun getFlashcardSet(setId: String): FlashcardSet

    suspend fun setFlashcardFavorite(setId: String, favorite: Boolean): FlashcardSet

    suspend fun setFlashcardTags(setId: String, tags: List<String>): FlashcardSet

    suspend fun listTags(): List<LearningTag>

    suspend fun listExamFolders(): List<ExamFolder>

    suspend fun listExams(
        folderId: String? = null,
        search: String? = null,
        favoriteOnly: Boolean = false,
        tag: String? = null,
    ): List<Exam>

    suspend fun getExam(examId: String): Exam

    suspend fun setExamFavorite(examId: String, favorite: Boolean): Exam

    suspend fun setExamTags(examId: String, tags: List<String>): Exam

    suspend fun startAttempt(examId: String): LiveAttempt

    suspend fun getAttempt(attemptId: String): LiveAttempt

    suspend fun saveAnswer(attemptId: String, questionId: String, selectedOptionId: String?)

    suspend fun submitAttempt(attemptId: String, answers: Map<String, String?>): ExamResult

    suspend fun getDashboard(): DashboardSummary

    suspend fun search(query: String): SearchResults
}

@Singleton
class StudyRepositoryImpl @Inject constructor(
    private val api: StudyApi,
    private val tokenStore: TokenStore,
) : StudyRepository {
    override suspend fun login(username: String, password: String): User {
        val response = request { api.login(LoginRequest(username, password)) }
        tokenStore.saveSession(response.accessToken, response.user.username)
        return User(response.user.username)
    }

    override suspend fun me(): User {
        val response = request { api.me() }
        if (!response.authenticated) {
            tokenStore.clear()
            throw IllegalStateException("Session is not authenticated")
        }
        return User(response.username)
    }

    override suspend fun logout() {
        runCatching { request { api.logout() } }
        tokenStore.clear()
    }

    override suspend fun listFlashcardSets(search: String?, favoriteOnly: Boolean, tag: String?): List<FlashcardSet> =
        request { api.listFlashcardSets(search = search, favorite = favoriteOnly.takeIf { it }, tag = tag) }
            .items
            .map(::mapSet)

    override suspend fun getFlashcardSet(setId: String): FlashcardSet =
        mapSet(request { api.getFlashcardSet(setId) })

    override suspend fun setFlashcardFavorite(setId: String, favorite: Boolean): FlashcardSet =
        mapSet(request { api.setFlashcardFavorite(setId, FavoriteRequest(favorite)) })

    override suspend fun setFlashcardTags(setId: String, tags: List<String>): FlashcardSet =
        mapSet(request { api.setFlashcardTags(setId, SetTagsRequest(tags)) })

    override suspend fun listTags(): List<LearningTag> =
        request { api.listTags() }.map(::mapTag)

    override suspend fun listExamFolders(): List<ExamFolder> =
        request { api.listExamFolders() }.map(::mapFolder)

    override suspend fun listExams(
        folderId: String?,
        search: String?,
        favoriteOnly: Boolean,
        tag: String?,
    ): List<Exam> =
        request {
            api.listExams(
                folderId = folderId,
                search = search,
                favorite = favoriteOnly.takeIf { it },
                tag = tag,
            )
        }.items.map(::mapExam)

    override suspend fun getExam(examId: String): Exam =
        mapExam(request { api.getExam(examId) })

    override suspend fun setExamFavorite(examId: String, favorite: Boolean): Exam =
        mapExam(request { api.setExamFavorite(examId, FavoriteRequest(favorite)) })

    override suspend fun setExamTags(examId: String, tags: List<String>): Exam =
        mapExam(request { api.setExamTags(examId, SetTagsRequest(tags)) })

    override suspend fun startAttempt(examId: String): LiveAttempt =
        mapAttempt(request { api.startAttempt(examId) })

    override suspend fun getAttempt(attemptId: String): LiveAttempt =
        mapAttempt(request { api.getAttempt(attemptId) })

    override suspend fun saveAnswer(
        attemptId: String,
        questionId: String,
        selectedOptionId: String?,
    ) {
        request {
            api.saveAnswers(
                attemptId,
                SaveAnswersRequest(listOf(AnswerDto(questionId, selectedOptionId))),
            )
        }
    }

    override suspend fun submitAttempt(
        attemptId: String,
        answers: Map<String, String?>,
    ): ExamResult {
        val request = SubmitAttemptRequest(
            answers = answers.map { (questionId, selectedOptionId) ->
                AnswerDto(questionId, selectedOptionId)
            },
        )
        return mapResult(request { api.submitAttempt(attemptId, request) })
    }

    override suspend fun getDashboard(): DashboardSummary =
        mapDashboard(request { api.dashboard() })

    override suspend fun search(query: String): SearchResults =
        mapSearch(request { api.search(query) })

    private suspend fun <T> request(block: suspend () -> T): T {
        return try {
            block()
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (throwable: Throwable) {
            val mapped = ApiErrorMapper.map(throwable)
            if (mapped.isUnauthorized) tokenStore.clear()
            throw mapped
        }
    }

    private fun mapSet(dto: FlashcardSetDto) = FlashcardSet(
        id = dto.id,
        title = dto.title,
        description = dto.description,
        cardCount = dto.cardCount,
        isFavorite = dto.isFavorite,
        tags = dto.tags.map(::mapTag),
        cards = dto.cards.orEmpty().map(::mapCard),
    )

    private fun mapTag(dto: com.japaneselearning.mobile.data.remote.TagDto) = LearningTag(
        id = dto.id,
        slug = dto.slug,
        name = dto.name,
    )

    private fun mapCard(dto: FlashcardDto) = com.japaneselearning.mobile.data.model.Flashcard(
        id = dto.id,
        setId = dto.setId,
        front = dto.front,
        back = dto.back,
        position = dto.position,
    )

    private fun mapFolder(dto: ExamFolderDto): ExamFolder = ExamFolder(
        id = dto.id,
        parentId = dto.parentId,
        name = dto.name,
        examCount = dto.examCount ?: 0,
        children = dto.children.map(::mapFolder),
    )

    private fun mapExam(dto: ExamDto): Exam = Exam(
        id = dto.id,
        folderId = dto.folderId,
        title = dto.title,
        description = dto.description,
        timeLimitSeconds = dto.timeLimitSeconds,
        questionCount = dto.questionCount,
        bestScore = dto.bestScore ?: dto.bestResult?.bestScore,
        isFavorite = dto.isFavorite,
        tags = dto.tags.map(::mapTag),
        questions = dto.questions.orEmpty().map(::mapQuestion),
    )

    private fun mapQuestion(dto: ExamQuestionDto) = com.japaneselearning.mobile.data.model.ExamQuestion(
        id = dto.id,
        content = dto.content,
        options = dto.options.map { option ->
            com.japaneselearning.mobile.data.model.ExamOption(
                id = option.id,
                content = option.content,
                isCorrect = option.isCorrect,
            )
        },
    )

    private fun mapAttempt(dto: LiveAttemptDto) = LiveAttempt(
        attemptId = dto.attemptId,
        examId = dto.examId,
        examTitle = dto.examTitle,
        expiresAt = dto.expiresAt,
        questions = dto.questions.map { question ->
            com.japaneselearning.mobile.data.model.LiveQuestion(
                id = question.id,
                content = question.content,
                options = question.options.map { option ->
                    com.japaneselearning.mobile.data.model.LiveOption(option.id, option.content)
                },
            )
        },
        savedAnswers = dto.savedAnswers,
    )

    private fun mapResult(dto: ExamResultDto) = ExamResult(
        attemptId = dto.attemptId,
        examId = dto.examId,
        examTitle = dto.examTitle,
        score = dto.score,
        correctCount = dto.correctCount,
        totalQuestions = dto.totalQuestions,
        durationSeconds = dto.durationSeconds,
        questions = dto.questions.map { question ->
            com.japaneselearning.mobile.data.model.GradedQuestion(
                questionId = question.questionId,
                content = question.content,
                selectedOptionId = question.selectedOptionId,
                correctOptionId = question.correctOptionId,
                isCorrect = question.isCorrect,
                options = question.options.map { option ->
                    com.japaneselearning.mobile.data.model.GradedOption(
                        id = option.id,
                        content = option.content,
                        isCorrect = option.isCorrect,
                    )
                },
            )
        },
        isNewBest = dto.isNewBest,
        bestScore = dto.bestScore,
    )

    private fun mapDashboard(dto: DashboardDto) = DashboardSummary(
        recentFlashcardSets = dto.recentFlashcardSets.map(::mapSet),
        recentExams = dto.recentExams.map(::mapExam),
        totalFlashcardSets = dto.totalFlashcardSets,
        totalCards = dto.totalCards,
        totalExams = dto.totalExams,
        recentBestScores = dto.recentBestScores.map {
            com.japaneselearning.mobile.data.model.RecentBestScore(it.examId, it.examTitle, it.bestScore)
        },
        recentLearning = dto.recentLearning.map {
            com.japaneselearning.mobile.data.model.RecentLearning(
                kind = it.kind,
                entityId = it.entityId,
                title = it.title,
                subtitle = it.subtitle,
                cardCount = it.cardCount,
                questionCount = it.questionCount,
            )
        },
    )

    private fun mapSearch(dto: SearchResultsDto) = SearchResults(
        flashcardSets = dto.flashcardSets.map(::mapSet),
        flashcards = dto.flashcards.map {
            com.japaneselearning.mobile.data.model.Flashcard(
                id = it.id,
                setId = it.setId,
                front = it.front,
                back = it.back,
                position = it.position,
            )
        },
        exams = dto.exams.map(::mapExam),
        folders = dto.folders.map(::mapFolder),
        total = dto.total,
    )
}
