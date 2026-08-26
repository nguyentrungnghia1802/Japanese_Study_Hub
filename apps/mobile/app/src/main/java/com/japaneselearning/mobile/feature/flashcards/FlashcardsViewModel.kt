package com.japaneselearning.mobile.feature.flashcards

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.data.cache.StudyReadCache
import com.japaneselearning.mobile.core.ui.ScreenState
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.LearningTag
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
    val selectedTag: String? = null,
    val tags: ScreenState<List<LearningTag>> = ScreenState(),
    val screen: ScreenState<List<FlashcardSet>> = ScreenState(),
)

@HiltViewModel
class FlashcardsViewModel @Inject constructor(
    private val repository: StudyRepository,
    private val readCache: StudyReadCache,
) : ViewModel() {
    private val _state = MutableStateFlow(FlashcardsUiState())
    val state: StateFlow<FlashcardsUiState> = _state.asStateFlow()

    init {
        loadTags()
        load()
    }

    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
        load(query)
    }

    fun setFavoriteOnly(enabled: Boolean) {
        _state.update { it.copy(favoriteOnly = enabled) }
        load()
    }

    fun setTag(tag: String?) {
        _state.update { it.copy(selectedTag = tag) }
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
            val canUseCache = query.isBlank() && !_state.value.favoriteOnly && _state.value.selectedTag == null
            if (canUseCache) {
                runCatching { readCache.readFlashcardSets() }.getOrNull()?.let { cached ->
                    _state.update {
                        it.copy(screen = ScreenState(isLoading = true, data = cached.data, isStale = true))
                    }
                }
            }
            _state.update { it.copy(screen = ScreenState(isLoading = true, data = it.screen.data ?: current, isStale = it.screen.isStale)) }
            try {
                val sets = repository.listFlashcardSets(
                    search = query.trim().takeIf { it.isNotEmpty() },
                    favoriteOnly = _state.value.favoriteOnly,
                    tag = _state.value.selectedTag,
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
                            isStale = it.screen.data != null,
                        ),
                    )
                }
            }
        }
    }

    private fun loadTags() {
        viewModelScope.launch {
            try {
                _state.update { it.copy(tags = ScreenState(isLoading = true, data = it.tags.data)) }
                val tags = repository.listTags()
                _state.update { it.copy(tags = ScreenState(isLoading = false, data = tags)) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(tags = ScreenState(isLoading = false, data = it.tags.data, error = error.message))
                }
            }
        }
    }
}
