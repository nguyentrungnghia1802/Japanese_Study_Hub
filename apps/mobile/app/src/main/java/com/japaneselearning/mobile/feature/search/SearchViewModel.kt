package com.japaneselearning.mobile.feature.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.ui.ScreenState
import com.japaneselearning.mobile.data.model.SearchResults
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SearchUiState(
    val query: String = "",
    val screen: ScreenState<SearchResults> = ScreenState(isLoading = false),
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repository: StudyRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(SearchUiState())
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
    }

    fun search() {
        val query = _state.value.query.trim()
        if (query.isEmpty()) {
            _state.value = SearchUiState()
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(screen = ScreenState(isLoading = true, data = it.screen.data)) }
            try {
                _state.update {
                    it.copy(screen = ScreenState(isLoading = false, data = repository.search(query)))
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(screen = ScreenState(isLoading = false, error = error.message ?: "Tìm kiếm thất bại."))
                }
            }
        }
    }

    fun retry() = search()
}
