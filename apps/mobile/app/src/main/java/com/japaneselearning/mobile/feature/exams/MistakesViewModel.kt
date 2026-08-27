package com.japaneselearning.mobile.feature.exams

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.FrequentMistake
import com.japaneselearning.mobile.data.model.FrequentMistakeSummary
import com.japaneselearning.mobile.data.model.MistakeAttemptDetail
import com.japaneselearning.mobile.data.model.MistakeAttemptSummary
import com.japaneselearning.mobile.data.model.RetainedMistakeItem
import com.japaneselearning.mobile.data.model.WrongAnswerReviewItem
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MistakesUiState(
    val isLoading: Boolean = true,
    val items: List<WrongAnswerReviewItem> = emptyList(),
    val total: Int = 0,
    val error: String? = null,
    val actionError: String? = null,
    val busyId: String? = null,
    val examIds: List<String> = emptyList(),
    val selectedExamId: String? = null,
    val attempts: List<MistakeAttemptSummary> = emptyList(),
    val selectedAttemptId: String? = null,
    val detail: MistakeAttemptDetail? = null,
    val frequent: FrequentMistakeSummary? = null,
    val historyLoading: Boolean = false,
    val historyError: String? = null,
    val reviewFilter: MistakeReviewFilter = MistakeReviewFilter.ALL,
    val reviewIndex: Int = 0,
    val flashcardSets: List<FlashcardSet> = emptyList(),
    val flashcardDraft: MistakeFlashcardDraft? = null,
    val isLoadingFlashcardSets: Boolean = false,
)

@HiltViewModel
class MistakesViewModel @Inject constructor(
    private val savedStateHandle: SavedStateHandle,
    private val repository: StudyRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(
        MistakesUiState(
            reviewFilter = savedFilter(),
            reviewIndex = savedStateHandle[KEY_INDEX] ?: 0,
        ),
    )
    val state: StateFlow<MistakesUiState> = _state.asStateFlow()
    private var historyJob: Job? = null
    private var historySequence = 0L

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val queue = repository.getWrongAnswerReviewQueue(MAX_QUEUE_SIZE)
                val items = queue.items.take(MAX_QUEUE_SIZE)
                val examIds = items.map { it.examId }.distinct().take(MAX_EXAMS)
                val restoredExam = savedStateHandle.get<String>(KEY_EXAM_ID)
                    ?.takeIf { it in examIds }
                val examId = restoredExam ?: examIds.firstOrNull()
                _state.update {
                    it.copy(
                        isLoading = false,
                        items = items,
                        total = queue.total,
                        examIds = examIds,
                        selectedExamId = examId,
                        error = null,
                    )
                }
                if (examId != null) loadHistory(examId)
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "Không tải được câu sai.",
                    )
                }
            }
        }
    }

    fun selectExam(examId: String) {
        if (examId !in _state.value.examIds) return
        savedStateHandle[KEY_EXAM_ID] = examId
        _state.update {
            it.copy(
                selectedExamId = examId,
                attempts = emptyList(),
                selectedAttemptId = null,
                detail = null,
                frequent = null,
                historyError = null,
            )
        }
        loadHistory(examId)
    }

    fun selectAttempt(attemptId: String) {
        val selected = _state.value.attempts.firstOrNull { it.attemptId == attemptId } ?: return
        savedStateHandle[KEY_ATTEMPT_ID] = selected.attemptId
        savedStateHandle[KEY_QUESTION_ID] = null
        _state.update { it.copy(selectedAttemptId = selected.attemptId, detail = null, historyError = null) }
        loadDetail(selected.attemptId)
    }

    fun setReviewFilter(filter: MistakeReviewFilter) {
        savedStateHandle[KEY_FILTER] = filter.name
        savedStateHandle[KEY_INDEX] = 0
        savedStateHandle[KEY_QUESTION_ID] = null
        _state.update { it.copy(reviewFilter = filter, reviewIndex = 0) }
    }

    fun setReviewIndex(index: Int) {
        val visible = MistakeReviewLogic.visibleItems(
            _state.value.detail?.items.orEmpty(),
            _state.value.reviewFilter,
        )
        if (index !in visible.indices) return
        savedStateHandle[KEY_INDEX] = index
        savedStateHandle[KEY_QUESTION_ID] = visible[index].questionId
        _state.update { it.copy(reviewIndex = index) }
    }

    fun openFrequent(mistake: FrequentMistake) {
        savedStateHandle[KEY_ATTEMPT_ID] = mistake.sourceAttemptId
        val attempt = _state.value.attempts.firstOrNull { it.attemptId == mistake.sourceAttemptId }
        if (attempt != null) {
            selectAttempt(attempt.attemptId)
            savedStateHandle[KEY_QUESTION_ID] = mistake.questionId
        }
    }

    fun beginCreateFlashcard(item: RetainedMistakeItem) {
        _state.update {
            it.copy(flashcardDraft = MistakeReviewLogic.flashcardDraft(item), actionError = null)
        }
        if (_state.value.flashcardSets.isEmpty()) loadFlashcardSets()
    }

    fun updateFlashcardFront(value: String) {
        _state.update { state -> state.copy(flashcardDraft = state.flashcardDraft?.copy(front = value)) }
    }

    fun updateFlashcardBack(value: String) {
        _state.update { state -> state.copy(flashcardDraft = state.flashcardDraft?.copy(back = value)) }
    }

    fun closeFlashcardDraft() {
        _state.update { it.copy(flashcardDraft = null, actionError = null) }
    }

    fun createFlashcard(setId: String) {
        val draft = _state.value.flashcardDraft ?: return
        val front = draft.front.trim()
        val back = draft.back.trim()
        if (front.isEmpty() || back.isEmpty()) {
            _state.update { it.copy(actionError = "Mặt trước và mặt sau không được để trống.") }
            return
        }
        if (_state.value.busyId != null) return
        viewModelScope.launch {
            _state.update { it.copy(busyId = CARD_BUSY_ID, actionError = null) }
            try {
                repository.createFlashcard(setId, front, back)
                _state.update { it.copy(flashcardDraft = null, busyId = null, actionError = null) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        busyId = null,
                        actionError = error.message ?: "Không tạo được flashcard.",
                    )
                }
            }
        }
    }

    fun dismiss(mistakeId: String) {
        if (_state.value.busyId != null) return
        viewModelScope.launch {
            _state.update { it.copy(busyId = mistakeId, actionError = null) }
            try {
                repository.dismissWrongAnswer(mistakeId)
                _state.update {
                    it.copy(
                        items = it.items.filterNot { item -> item.id == mistakeId },
                        total = (it.total - 1).coerceAtLeast(0),
                        busyId = null,
                    )
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        busyId = null,
                        actionError = error.message ?: "Không bỏ được câu sai.",
                    )
                }
            }
        }
    }

    fun clearAll() {
        if (_state.value.busyId != null) return
        viewModelScope.launch {
            _state.update { it.copy(busyId = ALL_BUSY_ID, actionError = null) }
            try {
                repository.clearWrongAnswers()
                savedStateHandle[KEY_ATTEMPT_ID] = null
                _state.update {
                    it.copy(
                        items = emptyList(),
                        total = 0,
                        examIds = emptyList(),
                        selectedExamId = null,
                        attempts = emptyList(),
                        selectedAttemptId = null,
                        detail = null,
                        frequent = null,
                        busyId = null,
                    )
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        busyId = null,
                        actionError = error.message ?: "Không xóa được hàng đợi.",
                    )
                }
            }
        }
    }

    private fun loadHistory(examId: String) {
        historyJob?.cancel()
        val sequence = ++historySequence
        historyJob = viewModelScope.launch {
            _state.update { it.copy(historyLoading = true, historyError = null) }
            try {
                val attempts = repository.getMistakeAttempts(examId).take(MAX_ATTEMPTS)
                val restoredAttempt = savedStateHandle.get<String>(KEY_ATTEMPT_ID)
                    ?.takeIf { id -> attempts.any { it.attemptId == id } }
                val attemptId = restoredAttempt ?: attempts.firstOrNull()?.attemptId
                val detail = attemptId?.let { repository.getMistakeAttemptDetail(it) }
                val frequent = repository.getFrequentMistakes(examId)
                if (sequence != historySequence) return@launch
                val restoredQuestionId = savedStateHandle.get<String>(KEY_QUESTION_ID)
                val visible = MistakeReviewLogic.visibleItems(detail?.items.orEmpty(), _state.value.reviewFilter)
                val restoredIndex = restoredQuestionId?.let { questionId ->
                    visible.indexOfFirst { it.questionId == questionId }.takeIf { it >= 0 }
                }
                _state.update {
                    it.copy(
                        historyLoading = false,
                        attempts = attempts,
                        selectedAttemptId = attemptId,
                        detail = detail,
                        frequent = frequent,
                        reviewIndex = restoredIndex ?: 0,
                        historyError = null,
                    )
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                if (sequence == historySequence) {
                    _state.update {
                        it.copy(
                            historyLoading = false,
                            historyError = error.message ?: "Không tải được lịch sử câu sai.",
                        )
                    }
                }
            }
        }
    }

    private fun loadDetail(attemptId: String) {
        val sequence = ++historySequence
        historyJob?.cancel()
        historyJob = viewModelScope.launch {
            _state.update { it.copy(historyLoading = true, historyError = null) }
            try {
                val detail = repository.getMistakeAttemptDetail(attemptId)
                if (sequence != historySequence) return@launch
                val questionId = savedStateHandle.get<String>(KEY_QUESTION_ID)
                val visible = MistakeReviewLogic.visibleItems(detail.items, _state.value.reviewFilter)
                val restoredIndex = questionId?.let { id -> visible.indexOfFirst { it.questionId == id }.takeIf { it >= 0 } } ?: 0
                _state.update {
                    it.copy(
                        historyLoading = false,
                        detail = detail,
                        reviewIndex = restoredIndex,
                        historyError = null,
                    )
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                if (sequence == historySequence) {
                    _state.update {
                        it.copy(
                            historyLoading = false,
                            historyError = error.message ?: "Không tải được chi tiết bài thi.",
                        )
                    }
                }
            }
        }
    }

    private fun loadFlashcardSets() {
        if (_state.value.isLoadingFlashcardSets) return
        viewModelScope.launch {
            _state.update { it.copy(isLoadingFlashcardSets = true, actionError = null) }
            try {
                val sets = repository.listFlashcardSets().take(MAX_FLASHCARD_SETS)
                _state.update { it.copy(flashcardSets = sets, isLoadingFlashcardSets = false) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        isLoadingFlashcardSets = false,
                        actionError = error.message ?: "Không tải được bộ thẻ.",
                    )
                }
            }
        }
    }

    private fun savedFilter(): MistakeReviewFilter = savedStateHandle.get<String>(KEY_FILTER)
        ?.let { value -> runCatching { MistakeReviewFilter.valueOf(value) }.getOrNull() }
        ?: MistakeReviewFilter.ALL

    companion object {
        const val MAX_QUEUE_SIZE = 20
        const val MAX_ATTEMPTS = 3
        const val MAX_EXAMS = 20
        const val MAX_FLASHCARD_SETS = 100
        const val ALL_BUSY_ID = "all"
        const val CARD_BUSY_ID = "flashcard"
        private const val KEY_EXAM_ID = "mistakes_exam_id"
        private const val KEY_ATTEMPT_ID = "mistakes_attempt_id"
        private const val KEY_FILTER = "mistakes_filter"
        private const val KEY_INDEX = "mistakes_index"
        private const val KEY_QUESTION_ID = "mistakes_question_id"
    }
}
