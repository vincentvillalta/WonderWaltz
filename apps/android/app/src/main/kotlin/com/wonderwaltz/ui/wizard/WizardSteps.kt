package com.wonderwaltz.ui.wizard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

private val PrettyDate = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DatesPartyStep(
    state: WizardUiState,
    viewModel: WizardViewModel,
) {
    var showPicker by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionHeader("When are you going?")
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "${state.startDate.format(PrettyDate)} → ${state.endDate.format(PrettyDate)}",
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "${java.time.temporal.ChronoUnit.DAYS.between(state.startDate, state.endDate) + 1} days in the parks",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                TextButton(onClick = { showPicker = true }) { Text("Change dates") }
            }
        }

        Spacer(Modifier.height(8.dp))
        SectionHeader("Who's coming?")

        state.guests.forEachIndexed { index, guest ->
            GuestCard(
                index = index,
                guest = guest,
                canRemove = state.guests.size > 1,
                onUpdate = { u -> viewModel.updateGuest(index, u) },
                onRemove = { viewModel.removeGuest(index) },
            )
        }

        TextButton(onClick = viewModel::addGuest) { Text("+ Add guest") }
    }

    if (showPicker) {
        val startMillis = state.startDate.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val endMillis = state.endDate.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val rangeState =
            rememberDateRangePickerState(
                initialSelectedStartDateMillis = startMillis,
                initialSelectedEndDateMillis = endMillis,
            )
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    val startMs = rangeState.selectedStartDateMillis
                    val endMs = rangeState.selectedEndDateMillis
                    if (startMs != null && endMs != null) {
                        viewModel.setDates(
                            LocalDate.ofEpochDay(startMs / 86_400_000L),
                            LocalDate.ofEpochDay(endMs / 86_400_000L),
                        )
                    }
                    showPicker = false
                }) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) { Text("Cancel") }
            },
        ) {
            DateRangePicker(state = rangeState)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GuestCard(
    index: Int,
    guest: WizardGuest,
    canRemove: Boolean,
    onUpdate: ((WizardGuest) -> WizardGuest) -> Unit,
    onRemove: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Guest ${index + 1}",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                if (canRemove) {
                    IconButton(onClick = onRemove) {
                        Text("✕", style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = guest.name,
                onValueChange = { v -> onUpdate { it.copy(name = v) } },
                label = { Text("Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = "Age",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                AgeBrackets.forEach { bracket ->
                    FilterChip(
                        selected = guest.ageBracket == bracket,
                        onClick = { onUpdate { it.copy(ageBracket = bracket) } },
                        label = { Text(bracket, style = MaterialTheme.typography.labelMedium) },
                        colors =
                            FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                            ),
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Has DAS accommodation",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f),
                )
                Switch(
                    checked = guest.hasDas,
                    onCheckedChange = { v -> onUpdate { it.copy(hasDas = v) } },
                )
            }
        }
    }
}

@Composable
fun PreferencesStep(
    state: WizardUiState,
    viewModel: WizardViewModel,
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionHeader("Budget tier")
        Text(
            text = "Guides Lightning Lane + dining recommendations.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        BudgetTier.values().forEach { tier ->
            Card(
                colors =
                    CardDefaults.cardColors(
                        containerColor =
                            if (state.budgetTier == tier) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.surface
                            },
                    ),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    RadioButton(
                        selected = state.budgetTier == tier,
                        onClick = { viewModel.setBudget(tier) },
                    )
                    Column(modifier = Modifier.padding(start = 4.dp, end = 12.dp).weight(1f)) {
                        Text(
                            text = tier.label,
                            style = MaterialTheme.typography.titleMedium,
                            color =
                                if (state.budgetTier == tier) {
                                    MaterialTheme.colorScheme.onPrimary
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                        )
                        Text(
                            text =
                                when (tier) {
                                    BudgetTier.PixieDust -> "Budget-conscious, skip paid Lightning Lane."
                                    BudgetTier.FairyTale -> "Moderate — LLMP for headliners."
                                    BudgetTier.RoyalTreatment -> "Premium — single LL, signature dining."
                                },
                            style = MaterialTheme.typography.bodyMedium,
                            color =
                                if (state.budgetTier == tier) {
                                    MaterialTheme.colorScheme.onPrimary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))
        SectionHeader("Mobility notes (optional)")
        OutlinedTextField(
            value = state.mobilityNotes,
            onValueChange = viewModel::setMobilityNotes,
            placeholder = { Text("e.g., uses a wheelchair; avoid steep ramps") },
            modifier = Modifier.fillMaxWidth().height(120.dp),
        )
    }
}

@Composable
fun ReviewStep(state: WizardUiState) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader("Ready to create your trip")

        ReviewRow("Dates", "${state.startDate.format(PrettyDate)} → ${state.endDate.format(PrettyDate)}")
        ReviewRow("Party", "${state.guests.size} guest${if (state.guests.size == 1) "" else "s"}")
        state.guests.forEachIndexed { i, g ->
            ReviewRow(
                "  · ${g.name.ifBlank { "Guest ${i + 1}" }}",
                g.ageBracket + if (g.hasDas) " · DAS" else "",
            )
        }
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        ReviewRow("Budget", state.budgetTier.label)
        if (state.mobilityNotes.isNotBlank()) {
            ReviewRow("Mobility", state.mobilityNotes)
        }

        state.error?.let { err ->
            Spacer(Modifier.height(8.dp))
            Text(
                text = err,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
            )
        }
    }
}

@Composable
private fun ReviewRow(
    label: String,
    value: String,
) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
            modifier = Modifier.weight(2f),
        )
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.headlineMedium,
        color = MaterialTheme.colorScheme.primary,
    )
}
