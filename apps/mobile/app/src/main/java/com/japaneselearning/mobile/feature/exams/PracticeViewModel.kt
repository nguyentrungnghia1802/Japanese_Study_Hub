package com.japaneselearning.mobile.feature.exams

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.LiveAttempt
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class PracticeUiState(
    val isLoading: Boolean = true,
    val attempt: LiveAttempt? = null,
    val currentIndex: Int = 0,
    val answers: Map<String, String?> = emptyMap(),
    val result: ExamResult? = null,
    val isSubmitting: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class PracticeViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: StudyRepository,
) : ViewModel() {
    private val examId: String = checkNotNull(savedStateHandle["examId"])
    private val mistakeIds: List<String> = checkNotNull(savedStateHandle.get<String>("mistakeIds"))
        .split(',')
        .map(String::trim)
        .filter(String::isNotEmpty)
    private val _state = MutableStateFlow(PracticeUiState())
    val state: StateFlow<PracticeUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val attempt = repository.startMistakePractice(examId, mistakeIds)
                _state.value = PracticeUiState(
                    isLoading = false,
                    attempt = attempt,
                    answers = attempt.savedAnswers,
                )
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(isLoading = false, error = error.message ?: "Không thể bắt đầu Practice.")
                }
            }
        }
    }

    fun selectOption(optionId: String) {
        val current = _state.value
        val question = current.attempt?.questions?.getOrNull(current.currentIndex) ?: return
        if (current.result != null || current.isSubmitting) return
        if (question.options.none { it.id == optionId }) return
        _state.update { it.copy(answers = it.answers + (question.id to optionId), error = null) }
    }

    fun next() {
        val size = _state.value.attempt?.questions?.size ?: 0
        _state.update { it.copy(currentIndex = ExamSessionLogic.nextIndex(it.currentIndex, size)) }
    }

    fun previous() {
        _state.update { it.copy(currentIndex = ExamSessionLogic.previousIndex(it.currentIndex)) }
    }

    fun submit() {
        if (_state.value.isSubmitting || _state.value.result != null) return
        viewModelScope.launch {
            val current = _state.value
            val attempt = current.attempt ?: return@launch
            _state.update { it.copy(isSubmitting = true, error = null) }
            try {
                val result = repository.submitAttempt(attempt.attemptId, current.answers)
                _state.update { it.copy(isSubmitting = false, result = result) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(isSubmitting = false, error = error.message ?: "Không thể nộp Practice.")
                }
            }
        }
    }
}
