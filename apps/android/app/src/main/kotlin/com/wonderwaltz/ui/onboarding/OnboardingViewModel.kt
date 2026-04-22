package com.wonderwaltz.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wonderwaltz.data.auth.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface OnboardingState {
    data object Idle : OnboardingState

    data object Loading : OnboardingState

    data object Ready : OnboardingState

    data class Error(val message: String) : OnboardingState
}

@HiltViewModel
class OnboardingViewModel
    @Inject
    constructor(
        private val authRepository: AuthRepository,
    ) : ViewModel() {
        private val _state = MutableStateFlow<OnboardingState>(OnboardingState.Idle)
        val state: StateFlow<OnboardingState> = _state.asStateFlow()

        fun start() {
            if (_state.value == OnboardingState.Loading || _state.value == OnboardingState.Ready) return
            runEnsureSession()
        }

        fun retry() {
            runEnsureSession()
        }

        private fun runEnsureSession() {
            _state.value = OnboardingState.Loading
            viewModelScope.launch {
                _state.value =
                    runCatching { authRepository.ensureSession() }
                        .fold(
                            onSuccess = { OnboardingState.Ready },
                            onFailure = { OnboardingState.Error(it.message ?: "Unknown error") },
                        )
            }
        }
    }
