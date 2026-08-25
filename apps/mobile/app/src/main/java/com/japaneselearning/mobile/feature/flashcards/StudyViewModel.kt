package com.japaneselearning.mobile.feature.flashcards

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.ui.ScreenState
import com.japaneselearning.mobile.data.model.Flashcard
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlin.random.Random
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class StudyUiState(
    val isLoading: Boolean = true,
    val set: FlashcardSet? = null,
    val cards: List<Flashcard> = emptyList(),
    val index: Int = 0,
    val isBackVisible: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class StudyViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: StudyRepository,
) : ViewModel() {
    private val setId: String = checkNotNull(savedStateHandle["setId"])
    private val _state = MutableStateFlow(StudyUiState())
    val state: StateFlow<StudyUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = StudyUiState(isLoading = true)
            try {
                val set = repository.getFlashcardSet(setId)
                _state.value = StudyUiState(isLoading = false, set = set, cards = set.cards)
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.value = StudyUiState(
                    isLoading = false,
                    error = error.message ?: "Không tải được nội dung học.",
                )
            }
        }
    }

    fun flip() = _state.value.let { current ->
        _state.value = current.copy(isBackVisible = !current.isBackVisible)
    }

    fun previous() {
        _state.value = _state.value.copy(
            index = (_state.value.index - 1).coerceAtLeast(0),
            isBackVisible = false,
        )
    }

    fun next() {
        _state.value = _state.value.copy(
            index = (_state.value.index + 1).coerceAtMost((_state.value.cards.size - 1).coerceAtLeast(0)),
            isBackVisible = false,
        )
    }

    fun shuffle() {
        _state.value = _state.value.copy(cards = _state.value.cards.shuffled(Random(System.nanoTime())), index = 0, isBackVisible = false)
    }
}
