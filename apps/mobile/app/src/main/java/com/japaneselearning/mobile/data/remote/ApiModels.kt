package com.japaneselearning.mobile.data.remote

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val username: String,
    val password: String,
)

@Serializable
data class FavoriteRequest(val favorite: Boolean)

@Serializable
data class SetTagsRequest(val tags: List<String>)

@Serializable
data class UserDto(val username: String)

@Serializable
data class LoginResponse(
    val accessToken: String,
    val expiresIn: Long,
    val user: UserDto,
)

@Serializable
data class AuthMeResponse(
    val username: String,
    val authenticated: Boolean,
)

@Serializable
data class SuccessResponse(val success: Boolean = true)

@Serializable
data class FlashcardDto(
    val id: String,
    val setId: String,
    val front: String,
    val back: String,
    val position: Int,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class FlashcardSetDto(
    val id: String,
    val title: String,
    val description: String? = null,
    val coverRef: String? = null,
    val isFavorite: Boolean = false,
    val tags: List<TagDto> = emptyList(),
    val cardCount: Int,
    val createdAt: String,
    val updatedAt: String,
    val cards: List<FlashcardDto>? = null,
)

@Serializable
data class FlashcardSetsResponse(
    val items: List<FlashcardSetDto> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20,
    val totalPages: Int = 1,
)

@Serializable
data class ExamFolderDto(
    val id: String,
    val parentId: String? = null,
    val name: String,
    val position: Int,
    val createdAt: String,
    val updatedAt: String,
    val children: List<ExamFolderDto> = emptyList(),
    val examCount: Int? = null,
)

@Serializable
data class ExamOptionDto(
    val id: String,
    val content: String,
    val position: Int,
    val isCorrect: Boolean? = null,
)

@Serializable
data class ExamQuestionDto(
    val id: String,
    val examId: String,
    val type: String,
    val content: String,
    val position: Int,
    val options: List<ExamOptionDto> = emptyList(),
    val contextId: String? = null,
)

@Serializable
data class BestResultDto(
    val id: String,
    val examId: String,
    val examVersion: Int,
    val bestScore: Double,
    val correctCount: Int,
    val totalQuestions: Int,
    val durationSeconds: Int? = null,
    val attemptCount: Int,
    val achievedAt: String,
    val lastAttemptAt: String,
)

@Serializable
data class ExamDto(
    val id: String,
    val folderId: String? = null,
    val title: String,
    val description: String? = null,
    val coverRef: String? = null,
    val isFavorite: Boolean = false,
    val tags: List<TagDto> = emptyList(),
    val timeLimitSeconds: Int? = null,
    val contentVersion: Int,
    val shuffleQuestions: Boolean = false,
    val shuffleOptions: Boolean = false,
    val questionCount: Int,
    val bestScore: Double? = null,
    val bestResult: BestResultDto? = null,
    val createdAt: String,
    val updatedAt: String,
    val questions: List<ExamQuestionDto>? = null,
)

@Serializable
data class TagDto(
    val id: String,
    val slug: String,
    val name: String,
)

@Serializable
data class ExamsResponse(
    val items: List<ExamDto> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20,
    val totalPages: Int = 1,
)

@Serializable
data class LiveOptionDto(
    val id: String,
    val content: String,
    val position: Int,
)

@Serializable
data class LiveQuestionDto(
    val id: String,
    val type: String,
    val content: String,
    val position: Int,
    val options: List<LiveOptionDto> = emptyList(),
)

@Serializable
data class LiveAttemptDto(
    val attemptId: String,
    val examId: String,
    val examTitle: String,
    val examVersion: Int,
    val timeLimitSeconds: Int? = null,
    val startedAt: String,
    val expiresAt: String? = null,
    val status: String,
    val totalQuestions: Int,
    val questions: List<LiveQuestionDto> = emptyList(),
    val savedAnswers: Map<String, String?> = emptyMap(),
)

@Serializable
data class AnswerDto(
    val questionId: String,
    val selectedOptionId: String? = null,
)

@Serializable
data class SaveAnswersRequest(val answers: List<AnswerDto>)

@Serializable
data class SubmitAttemptRequest(val answers: List<AnswerDto>? = null)

@Serializable
data class GradedOptionDto(
    val id: String,
    val content: String,
    val position: Int,
    val isCorrect: Boolean,
)

@Serializable
data class GradedQuestionDto(
    val questionId: String,
    val type: String,
    val content: String,
    val selectedOptionId: String? = null,
    val correctOptionId: String,
    val isCorrect: Boolean,
    val options: List<GradedOptionDto> = emptyList(),
)

@Serializable
data class ExamResultDto(
    val attemptId: String,
    val examId: String,
    val examTitle: String,
    val examVersion: Int,
    val status: String,
    val score: Double,
    val correctCount: Int,
    val totalQuestions: Int,
    val durationSeconds: Int? = null,
    val startedAt: String,
    val submittedAt: String,
    val questions: List<GradedQuestionDto> = emptyList(),
    val isNewBest: Boolean,
    val bestScore: Double,
)

@Serializable
data class SearchResultsDto(
    val flashcardSets: List<FlashcardSetDto> = emptyList(),
    val flashcards: List<FlashcardDtoWithSet> = emptyList(),
    val exams: List<ExamDto> = emptyList(),
    val folders: List<ExamFolderDto> = emptyList(),
    val total: Int = 0,
)

@Serializable
data class FlashcardDtoWithSet(
    val id: String,
    val setId: String,
    val setName: String,
    val front: String,
    val back: String,
    val position: Int,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class DashboardDto(
    val recentFlashcardSets: List<FlashcardSetDto> = emptyList(),
    val recentExams: List<ExamDto> = emptyList(),
    val totalFlashcardSets: Int = 0,
    val totalCards: Int = 0,
    val totalExams: Int = 0,
    val recentBestScores: List<RecentBestScoreDto> = emptyList(),
    val recentLearning: List<RecentLearningDto> = emptyList(),
)

@Serializable
data class RecentLearningDto(
    val kind: String,
    val entityId: String,
    val title: String,
    val subtitle: String? = null,
    val cardCount: Int? = null,
    val questionCount: Int? = null,
    val lastAccessedAt: String,
    val href: String,
)

@Serializable
data class RecentBestScoreDto(
    val examId: String,
    val examTitle: String,
    val bestScore: Double,
    val achievedAt: String,
)
