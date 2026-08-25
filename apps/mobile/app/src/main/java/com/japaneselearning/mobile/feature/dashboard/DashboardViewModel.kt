package com.japaneselearning.mobile.feature.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.ui.ScreenState
import com.japaneselearning.mobile.data.model.DashboardSummary
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: StudyRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ScreenState<DashboardSummary>())
    val state: StateFlow<ScreenState<DashboardSummary>> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = ScreenState(isLoading = true, data = _state.value.data)
            try {
                _state.value = ScreenState(isLoading = false, data = repository.getDashboard())
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.value = ScreenState(
                    isLoading = false,
                    data = _state.value.data,
                    error = error.message ?: "Không tải được tổng quan.",
                )
            }
        }
    }
}
