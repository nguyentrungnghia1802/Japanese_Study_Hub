package com.japaneselearning.mobile.feature.lookup

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.ui.ScreenState
import com.japaneselearning.mobile.data.model.DictionaryFavorite
import com.japaneselearning.mobile.data.model.DictionaryFavoriteDraft
import com.japaneselearning.mobile.data.model.DictionaryFavorites
import com.japaneselearning.mobile.data.model.DictionaryHistory
import com.japaneselearning.mobile.data.model.DictionaryHistoryItem
import com.japaneselearning.mobile.data.model.DictionaryLookup
import com.japaneselearning.mobile.data.model.DictionaryLookupDirection
import com.japaneselearning.mobile.data.model.DictionarySuggestions
import com.japaneselearning.mobile.data.model.FlashcardSet
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

data class DictionaryUiState(
    val query: String = "",
    val direction: DictionaryLookupDirection = DictionaryLookupDirection.AUTO,
    val includeExamples: Boolean = false,
    val lookup: ScreenState<DictionaryLookup> = ScreenState(isLoading = false),
    val suggestions: ScreenState<DictionarySuggestions> = ScreenState(isLoading = false),
    val history: ScreenState<DictionaryHistory> = ScreenState(isLoading = true),
    val favorites: ScreenState<DictionaryFavorites> = ScreenState(isLoading = true),
    val flashcardSets: ScreenState<List<FlashcardSet>> = ScreenState(isLoading = false),
    val favoriteBusy: Boolean = false,
    val isBlocked: Boolean = false,
    val actionError: String? = null,
)

@HiltViewModel
class DictionaryViewModel @Inject constructor(
    private val repository: StudyRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(DictionaryUiState())
    val state: StateFlow<DictionaryUiState> = _state.asStateFlow()
    private var suggestionJob: Job? = null
    private var lookupSequence = 0L
    private var suggestionSequence = 0L

    init {
        loadSavedItems()
    }

    fun setQuery(query: String) {
        _state.update { it.copy(query = query, actionError = null) }
        suggestionJob?.cancel()
        val sequence = ++suggestionSequence
        val normalized = query.trim()
        if (normalized.isEmpty() || _state.value.isBlocked) {
            _state.update { it.copy(suggestions = ScreenState(isLoading = false)) }
            return
        }
        suggestionJob = viewModelScope.launch {
            delay(SUGGESTION_DEBOUNCE_MILLIS)
            try {
                val suggestions = repository.dictionarySuggestions(
                    normalized,
                    _state.value.direction,
                    MAX_SUGGESTIONS,
                )
                if (sequence == suggestionSequence) {
                    _state.update { it.copy(suggestions = ScreenState(isLoading = false, data = suggestions)) }
                }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                if (sequence == suggestionSequence) {
                    _state.update {
                        it.copy(suggestions = ScreenState(isLoading = false, error = error.message))
                    }
                }
            }
        }
    }

    fun setDirection(direction: DictionaryLookupDirection) {
        _state.update { it.copy(direction = direction, suggestions = ScreenState(isLoading = false)) }
        if (_state.value.query.isNotBlank()) setQuery(_state.value.query)
    }

    fun setIncludeExamples(enabled: Boolean) {
        _state.update { it.copy(includeExamples = enabled) }
    }

    fun selectSuggestion(text: String) {
        if (_state.value.isBlocked) return
        setQuery(text)
        lookup()
    }

    fun setLookupBlocked(blocked: Boolean) {
        if (blocked) {
            suggestionJob?.cancel()
            ++suggestionSequence
            ++lookupSequence
        }
        _state.update { it.copy(isBlocked = blocked, suggestions = ScreenState(isLoading = false)) }
    }

    fun openHistory(item: DictionaryHistoryItem) {
        if (_state.value.isBlocked) return
        _state.update {
            it.copy(
                query = item.query,
                direction = item.direction,
                actionError = null,
            )
        }
        lookup()
    }

    fun openFavorite(item: DictionaryFavorite) {
        if (_state.value.isBlocked) return
        _state.update {
            it.copy(
                query = item.term,
                direction = item.direction,
                actionError = null,
            )
        }
        lookup()
    }

    fun lookup() {
        if (_state.value.isBlocked) {
            _state.update { it.copy(actionError = "Tra cứu bị khóa trong lúc làm bài thi.") }
            return
        }
        val query = _state.value.query.trim()
        if (query.isEmpty()) {
            _state.update { it.copy(actionError = "Nhập từ cần tra cứu trước.") }
            return
        }
        val direction = _state.value.direction
        val includeExamples = _state.value.includeExamples
        val sequence = ++lookupSequence
        _state.update { it.copy(lookup = ScreenState(isLoading = true), actionError = null) }
        viewModelScope.launch {
            try {
                val result = repository.dictionaryLookup(query, direction, MAX_RESULTS, includeExamples)
                if (sequence != lookupSequence) return@launch
                _state.update { it.copy(lookup = ScreenState(isLoading = false, data = result)) }
                loadHistory()
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                if (sequence == lookupSequence) {
                    _state.update {
                        it.copy(lookup = ScreenState(isLoading = false, error = error.message ?: "Tra cứu thất bại."))
                    }
                }
            }
        }
    }

    fun retryLookup() = lookup()

    fun loadSavedItems() {
        loadHistory()
        loadFavorites()
    }

    fun clearHistory() {
        if (_state.value.isBlocked) return
        viewModelScope.launch {
            try {
                repository.clearDictionaryHistory()
                _state.update { it.copy(history = ScreenState(isLoading = false, data = DictionaryHistory(emptyList(), 0)), actionError = null) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update { it.copy(actionError = error.message ?: "Không xóa được lịch sử tra cứu.") }
            }
        }
    }

    fun favoriteForResult(result: DictionaryLookup): DictionaryFavorite? {
        val primary = primaryTerm(result) ?: return null
        return _state.value.favorites.data?.items?.firstOrNull {
            it.term == primary.first && it.reading == primary.second && it.direction == result.direction
        }
    }

    fun toggleFavorite() {
        if (_state.value.isBlocked) return
        val result = _state.value.lookup.data ?: return
        val primary = primaryTerm(result)
        val source = result.results.firstOrNull()?.source ?: result.kanji?.source ?: result.sources.firstOrNull()
        val meaning = result.results.firstOrNull()?.meanings?.firstOrNull()
            ?: result.kanji?.vietnameseMeanings?.firstOrNull()
        if (result.direction == DictionaryLookupDirection.AUTO || primary == null || source == null || meaning.isNullOrBlank()) {
            _state.update { it.copy(actionError = "Kết quả chưa đủ nghĩa hoặc nguồn để lưu yêu thích.") }
            return
        }
        val existing = favoriteForResult(result)
        _state.update { it.copy(favoriteBusy = true, actionError = null) }
        viewModelScope.launch {
            try {
                if (existing != null) {
                    repository.removeDictionaryFavorite(existing.id)
                } else {
                    repository.saveDictionaryFavorite(
                        DictionaryFavoriteDraft(
                            term = primary.first,
                            reading = primary.second,
                            meaningSummary = meaning.take(512),
                            direction = result.direction,
                            source = source,
                        ),
                    )
                }
                loadFavorites()
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update { it.copy(actionError = error.message ?: "Không cập nhật được yêu thích.") }
            } finally {
                _state.update { it.copy(favoriteBusy = false) }
            }
        }
    }

    fun removeFavorite(id: String) {
        if (_state.value.isBlocked) return
        viewModelScope.launch {
            try {
                repository.removeDictionaryFavorite(id)
                loadFavorites()
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update { it.copy(actionError = error.message ?: "Không bỏ được yêu thích.") }
            }
        }
    }

    fun loadFlashcardSets() {
        if (_state.value.isBlocked) return
        viewModelScope.launch {
            _state.update { it.copy(flashcardSets = ScreenState(isLoading = true), actionError = null) }
            try {
                val sets = repository.listFlashcardSets().take(MAX_FLASHCARD_SETS)
                _state.update { it.copy(flashcardSets = ScreenState(isLoading = false, data = sets)) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update { it.copy(flashcardSets = ScreenState(isLoading = false, error = error.message ?: "Không tải được bộ thẻ.")) }
            }
        }
    }

    fun createFlashcard(setId: String, front: String, back: String, onComplete: () -> Unit) {
        if (_state.value.isBlocked) return
        val safeFront = front.trim()
        val safeBack = back.trim()
        if (safeFront.isEmpty() || safeBack.isEmpty()) {
            _state.update { it.copy(actionError = "Mặt trước và mặt sau không được để trống.") }
            return
        }
        viewModelScope.launch {
            try {
                repository.createFlashcard(setId, safeFront, safeBack)
                _state.update { it.copy(actionError = null) }
                onComplete()
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update { it.copy(actionError = error.message ?: "Không tạo được flashcard.") }
            }
        }
    }

    fun flashcardDraft(): DictionaryFavoriteDraft? {
        val result = _state.value.lookup.data ?: return null
        val primary = primaryTerm(result) ?: return null
        val source = result.results.firstOrNull()?.source ?: result.kanji?.source ?: result.sources.firstOrNull()
        val meaning = result.results.firstOrNull()?.meanings?.firstOrNull()
            ?: result.kanji?.vietnameseMeanings?.firstOrNull()
        if (source == null || meaning.isNullOrBlank()) return null
        return DictionaryFavoriteDraft(primary.first, primary.second, meaning, result.direction, source)
    }

    private fun loadHistory() {
        viewModelScope.launch {
            _state.update { it.copy(history = ScreenState(isLoading = true, data = it.history.data)) }
            try {
                val history = repository.dictionaryHistory(MAX_HISTORY)
                _state.update { it.copy(history = ScreenState(isLoading = false, data = history)) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update { it.copy(history = ScreenState(isLoading = false, data = it.history.data, error = error.message)) }
            }
        }
    }

    private fun loadFavorites() {
        viewModelScope.launch {
            _state.update { it.copy(favorites = ScreenState(isLoading = true, data = it.favorites.data)) }
            try {
                val favorites = repository.dictionaryFavorites(MAX_FAVORITES, 0)
                _state.update { it.copy(favorites = ScreenState(isLoading = false, data = favorites)) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update { it.copy(favorites = ScreenState(isLoading = false, data = it.favorites.data, error = error.message)) }
            }
        }
    }

    private fun primaryTerm(result: DictionaryLookup): Pair<String, String?>? {
        val word = result.results.firstOrNull()
        return if (word != null) word.writtenForm to word.reading else result.kanji?.character?.let { it to null }
    }

    companion object {
        const val MAX_RESULTS = 20
        const val MAX_SUGGESTIONS = 10
        const val MAX_HISTORY = 10
        const val MAX_FAVORITES = 20
        const val MAX_FLASHCARD_SETS = 100
        const val SUGGESTION_DEBOUNCE_MILLIS = 300L
    }
}
