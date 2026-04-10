plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.hilt) apply false
    // ksp plugin wired in Phase 7 when Hilt/Room annotations are used
    // alias(libs.plugins.ksp) apply false
}
