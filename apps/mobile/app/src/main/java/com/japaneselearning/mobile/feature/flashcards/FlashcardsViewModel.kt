package com.japaneselearning.mobile.feature.flashcards

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
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FlashcardsUiState(
    val query: String = "",
    val favoriteOnly: Boolean = false,
    val screen: ScreenState<List<FlashcardSet>> = ScreenState(),
)

@HiltViewModel
class FlashcardsViewModel @Inject constructor(
    private val repository: StudyRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(FlashcardsUiState())
    val state: StateFlow<FlashcardsUiState> = _state.asStateFlow()

    init { load() }

    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
        load(query)
    }

    fun setFavoriteOnly(enabled: Boolean) {
        _state.update { it.copy(favoriteOnly = enabled) }
        load()
    }

    fun setFavorite(setId: String, favorite: Boolean) {
        viewModelScope.launch {
            try {
                repository.setFlashcardFavorite(setId, favorite)
                load()
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(screen = it.screen.copy(error = error.message ?: "Không cập nhật được yêu thích."))
                }
            }
        }
    }

    fun load(query: String = _state.value.query) {
        viewModelScope.launch {
            val current = _state.value.screen.data
            _state.update { it.copy(screen = ScreenState(isLoading = true, data = current)) }
            try {
                val sets = repository.listFlashcardSets(
                    search = query.trim().takeIf { it.isNotEmpty() },
                    favoriteOnly = _state.value.favoriteOnly,
                )
                _state.update { it.copy(screen = ScreenState(isLoading = false, data = sets)) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        screen = ScreenState(
                            isLoading = false,
                            data = current,
                            error = error.message ?: "Không tải được bộ thẻ.",
                        ),
                    )
                }
            }
        }
    }
}
