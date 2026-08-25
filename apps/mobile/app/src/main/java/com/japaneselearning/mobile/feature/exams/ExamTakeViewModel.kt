package com.japaneselearning.mobile.feature.exams

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.storage.AttemptStore
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.LiveAttempt
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.Instant
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class ExamTakeUiState(
    val isLoading: Boolean = true,
    val attempt: LiveAttempt? = null,
    val currentIndex: Int = 0,
    val answers: Map<String, String?> = emptyMap(),
    val remainingSeconds: Long? = null,
    val result: ExamResult? = null,
    val isSubmitting: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ExamTakeViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: StudyRepository,
    private val attemptStore: AttemptStore,
) : ViewModel() {
    private val examId: String = checkNotNull(savedStateHandle["examId"])
    private val _state = MutableStateFlow(ExamTakeUiState())
    val state: StateFlow<ExamTakeUiState> = _state.asStateFlow()
    private var timerJob: Job? = null

    init { loadAttempt() }

    fun loadAttempt() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val persistedId = attemptStore.readActiveAttempt(examId)
                val attempt = persistedId?.let { id ->
                    runCatching { repository.getAttempt(id) }.getOrNull()
                } ?: repository.startAttempt(examId)
                val answers = attempt.savedAnswers
                _state.value = ExamTakeUiState(
                    isLoading = false,
                    attempt = attempt,
                    answers = answers,
                    remainingSeconds = calculateRemaining(attempt.expiresAt),
                )
                attemptStore.saveActiveAttempt(examId, attempt.attemptId)
                startTimer(attempt)
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "Không thể bắt đầu bài thi.",
                    )
                }
            }
        }
    }

    fun selectOption(optionId: String) {
        val current = _state.value
        val attempt = current.attempt ?: return
        val question = attempt.questions.getOrNull(current.currentIndex) ?: return
        if (current.isSubmitting || current.result != null) return
        if (question.options.none { it.id == optionId }) return

        _state.update { it.copy(answers = it.answers + (question.id to optionId), error = null) }
        viewModelScope.launch {
            runCatching { repository.saveAnswer(attempt.attemptId, question.id, optionId) }
                .onFailure { throwable ->
                    _state.update { it.copy(error = throwable.message ?: "Không lưu được đáp án.") }
                }
        }
    }

    fun next() {
        val state = _state.value
        val size = state.attempt?.questions?.size ?: 0
        _state.update { it.copy(currentIndex = ExamSessionLogic.nextIndex(it.currentIndex, size)) }
    }

    fun previous() {
        _state.update { it.copy(currentIndex = ExamSessionLogic.previousIndex(it.currentIndex)) }
    }

    fun goTo(index: Int) {
        val size = _state.value.attempt?.questions?.size ?: 0
        if (index in 0 until size) _state.update { it.copy(currentIndex = index) }
    }

    fun submit() {
        if (_state.value.isSubmitting || _state.value.result != null) return
        viewModelScope.launch { submitInternal() }
    }

    fun retry() = loadAttempt()

    override fun onCleared() {
        timerJob?.cancel()
        super.onCleared()
    }

    private suspend fun submitInternal() {
        val current = _state.value
        val attempt = current.attempt ?: return
        _state.update { it.copy(isSubmitting = true, error = null) }
        timerJob?.cancel()
        try {
            val result = repository.submitAttempt(attempt.attemptId, current.answers)
            attemptStore.clearActiveAttempt(examId)
            _state.update { it.copy(isSubmitting = false, result = result) }
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (error: Throwable) {
            _state.update {
                it.copy(isSubmitting = false, error = error.message ?: "Không thể nộp bài.")
            }
        }
    }

    private fun startTimer(attempt: LiveAttempt) {
        timerJob?.cancel()
        if (attempt.expiresAt == null) return
        timerJob = viewModelScope.launch {
            while (isActive && _state.value.result == null) {
                val remaining = calculateRemaining(attempt.expiresAt) ?: 0L
                _state.update { it.copy(remainingSeconds = remaining) }
                if (remaining <= 0L) {
                    submit()
                    break
                }
                delay(1000L)
            }
        }
    }

    private fun calculateRemaining(expiresAt: String?): Long? {
        if (expiresAt == null) return null
        val expiryMillis = runCatching { Instant.parse(expiresAt).toEpochMilli() }.getOrNull() ?: return null
        return ExamSessionLogic.remainingSeconds(expiryMillis, System.currentTimeMillis())
    }
}
