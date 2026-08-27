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
    val isShuffled: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class StudyViewModel @Inject constructor(
    private val savedStateHandle: SavedStateHandle,
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
                val restoredCards = StudySessionLogic.restoreOrder(savedCardIds(), set.cards)
                val cards = restoredCards ?: set.cards
                val canRestore = restoredCards != null
                val maxIndex = (cards.size - 1).coerceAtLeast(0)
                _state.value = StudyUiState(
                    isLoading = false,
                    set = set,
                    cards = cards,
                    index = if (canRestore) savedStateHandle.get<Int>(KEY_INDEX)?.coerceIn(0, maxIndex) ?: 0 else 0,
                    isBackVisible = canRestore && savedStateHandle.get<Boolean>(KEY_BACK_VISIBLE) == true,
                    isShuffled = canRestore && savedStateHandle.get<Boolean>(KEY_SHUFFLED) == true,
                )
                if (canRestore) saveSession(_state.value) else clearSession()
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
        _state.value = current.copy(isBackVisible = !current.isBackVisible).also(::saveSession)
    }

    fun previous() {
        _state.value = _state.value.copy(
            index = (_state.value.index - 1).coerceAtLeast(0),
            isBackVisible = false,
        ).also(::saveSession)
    }

    fun next() {
        _state.value = _state.value.copy(
            index = (_state.value.index + 1).coerceAtMost((_state.value.cards.size - 1).coerceAtLeast(0)),
            isBackVisible = false,
        ).also(::saveSession)
    }

    fun shuffle() {
        _state.value = _state.value.copy(
            cards = _state.value.cards.shuffled(Random(System.nanoTime())),
            index = 0,
            isBackVisible = false,
            isShuffled = true,
        ).also(::saveSession)
    }

    private fun savedCardIds(): List<String>? =
        savedStateHandle.get<ArrayList<String>>(KEY_CARD_ORDER)?.toList()

    private fun saveSession(state: StudyUiState) {
        if (state.cards.isEmpty() || state.cards.size > StudySessionLogic.MAX_SAVED_CARD_IDS) return
        savedStateHandle[KEY_CARD_ORDER] = ArrayList(state.cards.map { it.id })
        savedStateHandle[KEY_INDEX] = state.index.coerceIn(0, (state.cards.size - 1).coerceAtLeast(0))
        savedStateHandle[KEY_BACK_VISIBLE] = state.isBackVisible
        savedStateHandle[KEY_SHUFFLED] = state.isShuffled
    }

    private fun clearSession() {
        savedStateHandle.remove<ArrayList<String>>(KEY_CARD_ORDER)
        savedStateHandle.remove<Int>(KEY_INDEX)
        savedStateHandle.remove<Boolean>(KEY_BACK_VISIBLE)
        savedStateHandle.remove<Boolean>(KEY_SHUFFLED)
    }

    companion object {
        private const val KEY_CARD_ORDER = "study_card_order"
        private const val KEY_INDEX = "study_index"
        private const val KEY_BACK_VISIBLE = "study_back_visible"
        private const val KEY_SHUFFLED = "study_shuffled"
    }
}
