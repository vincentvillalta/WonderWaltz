package com.wonderwaltz.ui.nav

object Routes {
    const val ONBOARDING = "onboarding"
    const val WIZARD = "wizard"
    const val PLAN = "plan/{tripId}"

    fun plan(tripId: String): String = "plan/$tripId"
}
