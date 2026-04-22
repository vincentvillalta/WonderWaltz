package com.wonderwaltz.ui.wizard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wonderwaltz.data.auth.AuthStore
import com.wonderwaltz.data.network.CreateTripRequest
import com.wonderwaltz.data.network.GuestInput
import com.wonderwaltz.data.network.TripPreferences
import com.wonderwaltz.data.network.WWApi
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class WizardStep { DatesParty, Preferences, Review }

enum class BudgetTier(val apiValue: String, val label: String) {
    PixieDust("pixie_dust", "Pixie Dust"),
    FairyTale("fairy_tale", "Fairy Tale"),
    RoyalTreatment("royal_treatment", "Royal Treatment"),
}

/**
 * Age brackets mirror LEGL-07 COPPA-safe enum from the backend.
 * Never stored as birthdate — always a bracket string.
 */
val AgeBrackets = listOf("0-2", "3-6", "7-9", "10-13", "14-17", "18+")

data class WizardGuest(
    val name: String = "",
    val ageBracket: String = "18+",
    val hasDas: Boolean = false,
)

data class WizardUiState(
    val step: WizardStep = WizardStep.DatesParty,
    val startDate: LocalDate = LocalDate.now().plusDays(30),
    val endDate: LocalDate = LocalDate.now().plusDays(34),
    val guests: List<WizardGuest> = listOf(WizardGuest(name = "Guest 1")),
    val budgetTier: BudgetTier = BudgetTier.FairyTale,
    val mobilityNotes: String = "",
    val submitting: Boolean = false,
    val error: String? = null,
    val createdTripId: String? = null,
)

@HiltViewModel
class WizardViewModel
    @Inject
    constructor(
        private val api: WWApi,
        private val authStore: AuthStore,
    ) : ViewModel() {
        private val _state = MutableStateFlow(WizardUiState())
        val state: StateFlow<WizardUiState> = _state.asStateFlow()

        fun setDates(
            start: LocalDate,
            end: LocalDate,
        ) {
            _state.update { it.copy(startDate = start, endDate = end) }
        }

        fun updateGuest(
            index: Int,
            update: (WizardGuest) -> WizardGuest,
        ) {
            _state.update { s ->
                s.copy(
                    guests =
                        s.guests.mapIndexed { i, g ->
                            if (i == index) update(g) else g
                        },
                )
            }
        }

        fun addGuest() {
            _state.update { s ->
                s.copy(
                    guests = s.guests + WizardGuest(name = "Guest ${s.guests.size + 1}"),
                )
            }
        }

        fun removeGuest(index: Int) {
            _state.update { s ->
                if (s.guests.size <= 1) s else s.copy(guests = s.guests.filterIndexed { i, _ -> i != index })
            }
        }

        fun setBudget(tier: BudgetTier) {
            _state.update { it.copy(budgetTier = tier) }
        }

        fun setMobilityNotes(notes: String) {
            _state.update { it.copy(mobilityNotes = notes) }
        }

        fun goToStep(step: WizardStep) {
            _state.update { it.copy(step = step) }
        }

        fun next() {
            val current = _state.value.step
            val nextStep =
                when (current) {
                    WizardStep.DatesParty -> WizardStep.Preferences
                    WizardStep.Preferences -> WizardStep.Review
                    WizardStep.Review -> return
                }
            _state.update { it.copy(step = nextStep) }
        }

        fun back() {
            val current = _state.value.step
            val previous =
                when (current) {
                    WizardStep.DatesParty -> return
                    WizardStep.Preferences -> WizardStep.DatesParty
                    WizardStep.Review -> WizardStep.Preferences
                }
            _state.update { it.copy(step = previous) }
        }

        fun submit() {
            val s = _state.value
            if (s.submitting) return
            _state.update { it.copy(submitting = true, error = null) }
            viewModelScope.launch {
                val request =
                    CreateTripRequest(
                        startDate = s.startDate.format(DateTimeFormatter.ISO_LOCAL_DATE),
                        endDate = s.endDate.format(DateTimeFormatter.ISO_LOCAL_DATE),
                        guests =
                            s.guests.map {
                                GuestInput(
                                    name = it.name.ifBlank { "Guest" },
                                    ageBracket = it.ageBracket,
                                    hasDas = it.hasDas,
                                )
                            },
                        preferences =
                            TripPreferences(
                                budgetTier = s.budgetTier.apiValue,
                                mustDoAttractionIds = emptyList(),
                                mobilityNotes = s.mobilityNotes.ifBlank { null },
                            ),
                    )
                _state.value =
                    runCatching { api.createTrip(request) }
                        .fold(
                            onSuccess = { trip ->
                                authStore.saveTripId(trip.id)
                                _state.value.copy(
                                    submitting = false,
                                    createdTripId = trip.id,
                                )
                            },
                            onFailure = { e ->
                                _state.value.copy(
                                    submitting = false,
                                    error = e.message ?: "Failed to create trip",
                                )
                            },
                        )
            }
        }

        fun acknowledgeCreated() {
            _state.update { it.copy(createdTripId = null) }
        }
    }
