package com.japaneselearning.mobile.feature.flashcards

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.data.model.FlashcardReviewCard
import com.japaneselearning.mobile.data.model.FlashcardReviewRating
import com.japaneselearning.mobile.data.model.FlashcardReviewSummary
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import java.util.UUID
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ReviewUiState(
    val isLoading: Boolean = true,
    val isLoadingMore: Boolean = false,
    val summary: FlashcardReviewSummary? = null,
    val cards: List<FlashcardReviewCard> = emptyList(),
    val reviewedCount: Int = 0,
    val isBackVisible: Boolean = false,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val actionError: String? = null,
)

@HiltViewModel
class ReviewViewModel @Inject constructor(
    private val repository: StudyRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ReviewUiState())
    val state: StateFlow<ReviewUiState> = _state.asStateFlow()

    private val completedCardIds = mutableSetOf<String>()
    private val requestIds = mutableMapOf<String, String>()

    init { load() }

    fun load() {
        completedCardIds.clear()
        requestIds.clear()
        viewModelScope.launch {
            _state.value = ReviewUiState(isLoading = true)
            try {
                val summary = repository.getFlashcardReviewSummary()
                val queue = repository.getFlashcardReviewQueue(ReviewSessionLogic.MAX_ACTIVE_REVIEW_CARDS)
                _state.value = ReviewUiState(
                    isLoading = false,
                    summary = summary,
                    cards = ReviewSessionLogic.boundedQueue(queue.cards),
                )
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.value = ReviewUiState(
                    isLoading = false,
                    error = error.message ?: "Không tải được hàng đợi ôn tập.",
                )
            }
        }
    }

    fun flip() {
        if (_state.value.isSubmitting || _state.value.cards.isEmpty()) return
        _state.update { it.copy(isBackVisible = !it.isBackVisible) }
    }

    fun rate(rating: FlashcardReviewRating) {
        val current = _state.value
        val card = current.cards.firstOrNull() ?: return
        if (!current.isBackVisible || current.isSubmitting) return

        val requestKey = "${card.id}:${rating.name}"
        val clientRequestId = requestIds.getOrPut(requestKey) { UUID.randomUUID().toString() }
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, actionError = null) }
            try {
                repository.submitFlashcardReview(card.id, rating, clientRequestId)
                completedCardIds += card.id
                _state.update {
                    it.copy(
                        cards = it.cards.filterNot { item -> item.id == card.id },
                        reviewedCount = it.reviewedCount + 1,
                        isBackVisible = false,
                        isSubmitting = false,
                    )
                }
                refreshSummary()
                if (_state.value.cards.isEmpty()) fetchNextBatch()
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        isSubmitting = false,
                        actionError = error.message ?: "Không gửi được đánh giá. Hãy thử lại.",
                    )
                }
            }
        }
    }

    fun retryNextBatch() {
        if (_state.value.cards.isEmpty() && !_state.value.isLoadingMore) {
            viewModelScope.launch { fetchNextBatch() }
        }
    }

    private suspend fun refreshSummary() {
        try {
            val summary = repository.getFlashcardReviewSummary()
            _state.update { it.copy(summary = summary) }
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (_: Throwable) {
            // The submitted rating is already authoritative; retain the last counts until retry.
        }
    }

    private suspend fun fetchNextBatch() {
        _state.update { it.copy(isLoadingMore = true, actionError = null) }
        try {
            val queue = repository.getFlashcardReviewQueue(ReviewSessionLogic.MAX_ACTIVE_REVIEW_CARDS)
            val nextCards = ReviewSessionLogic.boundedQueue(queue.cards)
                .filterNot { completedCardIds.contains(it.id) }
            _state.update {
                it.copy(
                    isLoadingMore = false,
                    cards = nextCards,
                    isBackVisible = false,
                )
            }
            refreshSummary()
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (error: Throwable) {
            _state.update {
                it.copy(
                    isLoadingMore = false,
                    actionError = "Đã lưu đánh giá nhưng không tải được thẻ tiếp theo. " +
                        (error.message ?: "Hãy thử lại."),
                )
            }
        }
    }
}
