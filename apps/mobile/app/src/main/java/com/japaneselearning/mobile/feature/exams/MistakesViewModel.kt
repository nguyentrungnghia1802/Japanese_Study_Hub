package com.japaneselearning.mobile.feature.exams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.data.model.WrongAnswerReviewItem
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
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
)

@HiltViewModel
class MistakesViewModel @Inject constructor(
    private val repository: StudyRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(MistakesUiState())
    val state: StateFlow<MistakesUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val queue = repository.getWrongAnswerReviewQueue(MAX_QUEUE_SIZE)
                _state.value = MistakesUiState(
                    isLoading = false,
                    items = queue.items.take(MAX_QUEUE_SIZE),
                    total = queue.total,
                )
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
                _state.update { it.copy(items = emptyList(), total = 0, busyId = null) }
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

    companion object {
        const val MAX_QUEUE_SIZE = 20
        const val ALL_BUSY_ID = "all"
    }
}
