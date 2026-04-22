package com.wonderwaltz.data.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiEnvelope<T>(
    val data: T,
    val meta: ApiMeta,
)

@Serializable
data class ApiMeta(
    val disclaimer: String,
)

@Serializable
data class AnonymousAuthResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("user_id") val userId: String,
    @SerialName("expires_at") val expiresAt: String,
)

@Serializable
data class GuestInput(
    val name: String,
    @SerialName("age_bracket") val ageBracket: String,
    @SerialName("has_das") val hasDas: Boolean,
)

@Serializable
data class TripPreferences(
    @SerialName("budget_tier") val budgetTier: String,
    @SerialName("must_do_attraction_ids") val mustDoAttractionIds: List<String> = emptyList(),
    @SerialName("mobility_notes") val mobilityNotes: String? = null,
)

@Serializable
data class CreateTripRequest(
    @SerialName("start_date") val startDate: String,
    @SerialName("end_date") val endDate: String,
    val guests: List<GuestInput>,
    val preferences: TripPreferences,
    @SerialName("resort_id") val resortId: String? = null,
)

@Serializable
data class Trip(
    val id: String,
    @SerialName("start_date") val startDate: String,
    @SerialName("end_date") val endDate: String,
    val guests: List<GuestInput> = emptyList(),
    @SerialName("entitlement_state") val entitlementState: String? = null,
    @SerialName("current_plan_id") val currentPlanId: String? = null,
)
