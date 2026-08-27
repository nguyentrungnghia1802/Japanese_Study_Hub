package com.japaneselearning.mobile.feature.exams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.storage.AttemptStore
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

@HiltViewModel
class AttemptGateViewModel @Inject constructor(
    attemptStore: AttemptStore,
) : ViewModel() {
    val hasActiveAttempt: StateFlow<Boolean> = attemptStore.activeAttempts
        .map { it.isNotEmpty() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)
}
