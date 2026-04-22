package com.wonderwaltz.ui.nav

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.wonderwaltz.ui.onboarding.OnboardingScreen
import com.wonderwaltz.ui.plan.PlanStubScreen
import com.wonderwaltz.ui.wizard.WizardScreen

@Composable
fun WWNavHost() {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = Routes.ONBOARDING) {
        composable(Routes.ONBOARDING) {
            OnboardingScreen(
                onReady = {
                    nav.navigate(Routes.WIZARD) {
                        popUpTo(Routes.ONBOARDING) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.WIZARD) {
            WizardScreen(
                onTripCreated = { tripId ->
                    nav.navigate(Routes.plan(tripId)) {
                        popUpTo(Routes.WIZARD) { inclusive = true }
                    }
                },
            )
        }
        composable(
            route = Routes.PLAN,
            arguments = listOf(navArgument("tripId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val tripId = backStackEntry.arguments?.getString("tripId").orEmpty()
            PlanStubScreen(tripId = tripId)
        }
    }
}
