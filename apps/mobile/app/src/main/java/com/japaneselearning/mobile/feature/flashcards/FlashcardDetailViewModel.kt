package com.japaneselearning.mobile.feature.flashcards

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.ui.ScreenState
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class FlashcardDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: StudyRepository,
) : ViewModel() {
    private val setId: String = checkNotNull(savedStateHandle["setId"])
    private val _state = MutableStateFlow(ScreenState<FlashcardSet>())
    val state: StateFlow<ScreenState<FlashcardSet>> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = ScreenState(isLoading = true, data = _state.value.data)
            try {
                _state.value = ScreenState(isLoading = false, data = repository.getFlashcardSet(setId))
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.value = ScreenState(
                    isLoading = false,
                    data = _state.value.data,
                    error = error.message ?: "Không tải được bộ thẻ.",
                )
            }
        }
    }
}
