package com.wonderwaltz.ui.wizard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WizardScreen(
    onTripCreated: (tripId: String) -> Unit,
    viewModel: WizardViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.createdTripId) {
        state.createdTripId?.let {
            viewModel.acknowledgeCreated()
            onTripCreated(it)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text =
                            when (state.step) {
                                WizardStep.DatesParty -> "Dates & Party"
                                WizardStep.Preferences -> "Preferences"
                                WizardStep.Review -> "Review"
                            },
                        style = MaterialTheme.typography.headlineMedium,
                    )
                },
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background,
                        titleContentColor = MaterialTheme.colorScheme.primary,
                    ),
            )
        },
    ) { padding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(padding),
        ) {
            LinearProgressIndicator(
                progress = {
                    when (state.step) {
                        WizardStep.DatesParty -> 1f / 3f
                        WizardStep.Preferences -> 2f / 3f
                        WizardStep.Review -> 3f / 3f
                    }
                },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
            )
            Spacer(Modifier.height(16.dp))

            Box(
                modifier =
                    Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 24.dp),
            ) {
                when (state.step) {
                    WizardStep.DatesParty -> DatesPartyStep(state, viewModel)
                    WizardStep.Preferences -> PreferencesStep(state, viewModel)
                    WizardStep.Review -> ReviewStep(state)
                }
            }

            WizardFooter(state, viewModel)
        }
    }
}

@Composable
private fun WizardFooter(
    state: WizardUiState,
    viewModel: WizardViewModel,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(24.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (state.step != WizardStep.DatesParty) {
            OutlinedButton(
                onClick = viewModel::back,
                enabled = !state.submitting,
                modifier = Modifier.weight(1f),
            ) { Text("Back") }
        } else {
            Spacer(Modifier.weight(1f))
        }

        if (state.step == WizardStep.Review) {
            Button(
                onClick = viewModel::submit,
                enabled = !state.submitting,
                modifier = Modifier.weight(2f),
            ) {
                if (state.submitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp).width(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("Creating…")
                } else {
                    Text("Create trip")
                }
            }
        } else {
            Button(
                onClick = viewModel::next,
                modifier = Modifier.weight(2f),
            ) { Text("Continue") }
        }
    }
}
