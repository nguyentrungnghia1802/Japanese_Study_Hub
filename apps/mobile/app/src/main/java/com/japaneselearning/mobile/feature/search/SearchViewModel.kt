package com.japaneselearning.mobile.feature.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.ui.ScreenState
import com.japaneselearning.mobile.data.model.SearchResults
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.LinkedHashMap

private const val SEARCH_DEBOUNCE_MILLIS = 300L
private const val SEARCH_CACHE_TTL_MILLIS = 2 * 60 * 1000L
private const val MAX_RECENT_SEARCHES = 5

data class SearchUiState(
    val query: String = "",
    val screen: ScreenState<SearchResults> = ScreenState(isLoading = false),
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val repository: StudyRepository,
) : ViewModel() {
    private data class CachedSearch(val results: SearchResults, val cachedAt: Long)

    private val _state = MutableStateFlow(SearchUiState())
    val state: StateFlow<SearchUiState> = _state.asStateFlow()
    private val recentSearches = LinkedHashMap<String, CachedSearch>(MAX_RECENT_SEARCHES, 0.75f, true)
    private var searchJob: Job? = null
    private var requestSequence = 0L

    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
        searchJob?.cancel()
        val requestId = ++requestSequence
        val normalizedQuery = query.trim()
        if (normalizedQuery.isEmpty()) {
            _state.value = SearchUiState()
            return
        }
        searchJob = viewModelScope.launch {
            delay(SEARCH_DEBOUNCE_MILLIS)
            executeSearch(normalizedQuery, requestId)
        }
    }

    fun search() {
        val query = _state.value.query.trim()
        searchJob?.cancel()
        val requestId = ++requestSequence
        if (query.isEmpty()) {
            _state.value = SearchUiState()
            return
        }
        searchJob = viewModelScope.launch {
            executeSearch(query, requestId)
        }
    }

    fun retry() = search()

    private suspend fun executeSearch(query: String, requestId: Long) {
        val now = System.currentTimeMillis()
        val cached = recentSearches[query]
        if (cached != null && now - cached.cachedAt <= SEARCH_CACHE_TTL_MILLIS) {
            if (requestId == requestSequence) {
                _state.update { it.copy(screen = ScreenState(isLoading = false, data = cached.results)) }
            }
            return
        }
        recentSearches.remove(query)

        _state.update { it.copy(screen = ScreenState(isLoading = true, data = null)) }
        try {
            val results = repository.search(query)
            if (requestId != requestSequence) return
            recentSearches[query] = CachedSearch(results, System.currentTimeMillis())
            while (recentSearches.size > MAX_RECENT_SEARCHES) {
                recentSearches.remove(recentSearches.entries.first().key)
            }
            _state.update { it.copy(screen = ScreenState(isLoading = false, data = results)) }
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (error: Throwable) {
            if (requestId != requestSequence) return
            _state.update {
                it.copy(screen = ScreenState(isLoading = false, error = error.message ?: "Tìm kiếm thất bại."))
            }
        }
    }
}
