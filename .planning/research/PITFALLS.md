# Pitfalls Research

**Domain:** Disney WDW trip-planning app — iOS/Android native, TypeScript backend, website, hybrid AI+solver itinerary engine, unofficial fan-app legal posture, per-trip consumable IAP
**Researched:** 2026-04-09
**Confidence:** MEDIUM-HIGH (legal areas HIGH confidence from primary sources; cold-start/solver areas MEDIUM from community + research; some platform specifics verified against official docs)

---

## Critical Pitfalls

### Pitfall 1: Disney C&D Over IP Infringement — the Existential Risk

**Severity:** EXISTENTIAL

**What goes wrong:**
Disney aggressively enforces trademark and copyright across all platforms. In 2025, Disney sent C&D letters to Character.AI and ByteDance (Seedance) for unauthorized use of characters and copyrighted material. Even apps that do not use Disney images can be targeted if the app name creates a likelihood of confusion with Disney trademarks, if marketing copy implies endorsement, or if attraction/ride photography not cleared for commercial use appears anywhere. The pattern: Disney discovers the app, legal sends a C&D, App Store/Play Store listings are pulled in response, and the app is dead overnight with no recourse. The founder is left with a rebuilt asset that cannot be monetized.

**Why it happens:**
Solo founders underestimate how broadly Disney's trademark portfolio extends. The word "Disney" itself is a registered trademark. The castle silhouette, the Mickey silhouette, specific font treatments associated with Disney IP, and ride photography are all protected. "Nominative fair use" (using attraction names descriptively) is a valid defense but only when the use is strictly referential — it does not protect imagery, logos, or trade dress. Founders assume "I'm not selling merchandise so it's fine" but Disney enforces service-mark infringement even for informational apps that use their brand to attract users.

**How to avoid:**
- Zero Disney trademarked imagery anywhere: no Mickey silhouette, no castle outline, no character art, no ride photography unless CC-licensed or explicitly user-provided. This is already a project constraint — treat it as absolutely non-negotiable.
- Use attraction and park names in purely descriptive, referential ways: "plan your visit to Magic Kingdom" not "experience Disney's Magic Kingdom®."
- The disclaimer "WonderWaltz is an independent, unofficial planning app. Not affiliated with, endorsed by, or sponsored by The Walt Disney Company" must appear on every surface — web, app store listing, in-app settings, and the About screen. Not just buried in terms of service.
- Conduct a trademark search on "WonderWaltz" before any public announcement (USPTO TESS + EUIPO). The project plan already flags this; execute it before Phase 10, ideally before Phase 1 so the name is locked.
- IP lawyer review is a hard gate. Do not skip it, do not do it last-minute. Budget 6-8 weeks for turnaround and revisions before launch.
- No scraping of Disney's own properties (My Disney Experience, Disney.com). Confirmed as v1 non-goal — maintain that line forever.
- Avoid any marketing copy like "the official Disney planner" or "Disney-approved." These trigger immediate confusion claims.

**Warning signs:**
- Any screenshot in the app or on the store listing that shows a Disney-owned image, even in background — audit all screenshots.
- Marketing copy that says "for your Disney vacation" without the word "unofficial" prominently nearby.
- An App Store description keyword field containing the word "Disney" (Apple Guideline 2.3.7 prohibits trademarked terms in keywords).
- Social media posts where you show the app interface against park photos you did not license.

**Phase to address:** Phase 0 (name + trademark search), Phase 1 (disclaimer architecture wired in from day 1), Phase 8 (website disclaimers on every page), Phase 10 (IP lawyer review — hard gate before any public listing).

**Real-world example:** Disney C&D to Character.AI (September 2025) forced immediate removal of all Disney characters from the platform within days. Disney sent a separate C&D to ByteDance/Seedance (February 2026) over AI-generated content using copyrighted characters. The pattern is: detect → C&D → immediate compliance required → product feature or entire product removed.

---

### Pitfall 2: App Store Rejection — Trademark Metadata Violation

**Severity:** HIGH

**What goes wrong:**
Apple's Guideline 2.3.7 explicitly prohibits packing app metadata with trademarked terms. The 100-character keyword field on App Store Connect is the most common trap — a developer adds "Disney," "Magic Kingdom," "Epcot," "Animal Kingdom," "Hollywood Studios" as keywords to capture search traffic. Apple's review catches this, rejects the binary, and may flag the account. The app never reaches users.

**Why it happens:**
"But they're descriptive keywords" — developers rationalize that attraction names are factual. But Apple's policy is unambiguous: trademarked terms in the keyword field, even descriptive ones, are prohibited. Note that using those names in the description text (not the keyword field) as factual references is generally acceptable under nominative fair use principles, but the keyword field is different — it's explicitly an ASO game, and Apple treats it as spam.

**How to avoid:**
- Keep "Disney," "Magic Kingdom," "Walt Disney World," "WDW," "Epcot," and all attraction names out of the 100-character keyword field entirely.
- The app description and subtitle can reference these terms factually and descriptively: "Plan your Walt Disney World trip with personalized itineraries." This is nominative fair use in context.
- App name and subtitle: "WonderWaltz — WDW Trip Planner" is borderline. "WDW" is a commonly used abbreviation that falls in a gray zone. Verify with the IP lawyer.
- Review screenshots: no Disney logos, no official Disney UI elements, no park signage with Disney wordmarks visible.
- App Store listing review notes should proactively state the unofficial fan-app posture to reduce back-and-forth with reviewers.

**Warning signs:**
- Keyword field contains any Disney-trademarked terms.
- App icon contains any element that could be confused with Disney trade dress.
- Any screenshot shows Disney-branded content not explicitly cleared.

**Phase to address:** Phase 10 (App Store listing creation), but metadata strategy should be decided in Phase 8 (website, brand, ASO thinking).

---

### Pitfall 3: App Store Rejection — Consumable IAP for "Digital Goods" Scrutiny

**Severity:** HIGH

**What goes wrong:**
A per-trip unlock is a consumable IAP for digital content. Apple reviews these carefully because consumable mechanics have historically been abused (fake currency that depletes artificially). A reviewer who does not understand the trip-unlock model may reject under Guideline 3.1.1 ("apps must use IAP for digital goods and services") with the note "this consumable does not appear to be consumed." Apple's definition of a consumable implies it depletes with use — a trip itinerary unlock that lasts "forever" reads to reviewers more like a non-consumable.

**Why it happens:**
The "per-trip unlock" model does not map cleanly to Apple's canonical consumable examples (game currency, lives, boosts). It is actually closer to a non-consumable (permanent feature unlock for one specific trip). Using consumable type means Apple expects the content to deplete — if a user can revisit their unlocked trip plan indefinitely, reviewers may flag it as misclassified.

**How to avoid:**
- Consider whether the IAP should be typed as a **non-consumable** (permanent unlock of one trip) rather than a consumable. Non-consumables have clearer Apple semantics for "buy once, keep forever" unlocks and support Restore Purchases — which consumables technically do not. However, non-consumables cannot be repurchased for the same product ID, which breaks "buy a new trip unlock."
- A cleaner model: multiple non-consumable product IDs (one per trip, differentiated by trip ID) — but this is complex to manage in App Store Connect.
- Alternative: a single consumable SKU where each purchase "consumes" one trip credit that gets applied to a specific trip. The key is that the credit genuinely maps to a use event. RevenueCat supports consumable credit tracking via webhooks.
- In the App Store review notes, explicitly explain the unlock model: "Users purchase a one-time unlock for each trip they create. The consumable is redeemable once per trip — once applied to a trip, the same credit cannot be used again."
- Include the full unlock flow in your TestFlight sandbox credentials and review notes so reviewers can exercise it.

**Warning signs:**
- Reviewer rejection note mentions "IAP does not appear to be consumed" or references Guideline 3.1.1.
- Apple asking for clarification on what the consumable "depletes."
- Other apps in the trip-planning space using non-consumable per-unlock have not had issues while consumables have.

**Phase to address:** Phase 4 (backend + entitlement service design), Phase 6 (iOS IAP implementation), Phase 10 (App Store review notes and IAP framing).

---

### Pitfall 4: Apple External Payment Rules in 2026 — Compliance Trap

**Severity:** MEDIUM

**What goes wrong:**
As of 2026, Apple allows one external payment link per app in the US. However, the rules are nuanced: non-reader apps must still offer IAP as the primary option. The EU rule is opposite — you cannot offer both IAP and an external payment option in the same EU app version. Implementing the affiliate packing list with Amazon Associates links must comply with anti-steering rules: you cannot offer prices for products and then tell users to "buy cheaper on Amazon" in a way that steers away from hypothetical in-app purchases. The affiliate links are for physical goods (not digital content), so they are outside IAP scope — but the presentation matters.

**How to avoid:**
- Affiliate links (Amazon Associates) for physical goods (packing list items) are fully outside IAP scope and do not require IAP treatment. Physical goods are exempt from Apple's digital goods IAP mandate.
- Do not add pricing comparisons or "cheaper outside the app" language for the affiliate links — keep them purely as "buy this item" recommendations.
- For the trip unlock IAP, keep external payment links out of the app entirely in v1. Do not add a "buy on the website" button — that triggers the anti-steering / external link rules and requires careful compliance.
- Monitor EU App Store status. If significant EU users appear, a separate EU build may be needed that removes IAP and adds web checkout.

**Warning signs:**
- Adding "buy cheaper on our website" anywhere near the trip unlock paywall.
- Amazon affiliate links presented with pricing that implies a discount vs. the in-app price.

**Phase to address:** Phase 6 (iOS), Phase 7 (Android), Phase 8 (website).

---

### Pitfall 5: Data Source Fragility — queue-times.com and themeparks.wiki as Single Points of Failure

**Severity:** HIGH

**What goes wrong:**
Both data sources are community-operated, unguaranteed services with no SLA. queue-times.com is run independently and asks users to sponsor via Patreon. themeparks.wiki is an open-source project. Either can: go offline for hours or days, change their API format without notice, add rate limits without warning, add authentication requirements, or shut down entirely. The WonderWaltz solver depends on live and forecast wait-time data — if ingestion breaks, the solver generates plans from stale or missing data and users get bad itineraries on the day they need it most (inside the park).

**Why it happens:**
The project correctly identifies these as the primary data risk. The failure mode is not the absence of a plan — it is the silent degradation: the API returns stale data without an error, the ingestion worker succeeds, but wait times shown to users are 6 hours old. Users walk to a ride listed as "15 min wait" that is actually 90 minutes.

**How to avoid:**
- Never rely on a single source. The project plan already designates queue-times.com as primary and themeparks.wiki as secondary. Implement automatic failover, not just manual.
- Track data freshness explicitly. Every wait time record must carry a `fetched_at` timestamp. The solver must know "this wait time is X minutes old" and degrade gracefully (show stale indicator, widen confidence intervals, avoid routing through rides with stale data).
- Redis cache TTL must be longer than the polling interval. If you poll every 5 minutes, cache for 15-20 minutes so a single ingestion failure does not immediately surface stale data to clients.
- Sentry alert on ingestion lag exceeding 30 minutes. This was in the plan — implement from Phase 2, not Phase 9.
- Build the fallback to last-known-good historical medians. If live data is stale, fall back to the `wait_times_1h` continuous aggregate for that ride × day-of-week × hour bucket. Tell users "using typical wait times — live data unavailable."
- The own-scraper kill-switch is a legitimate insurance policy. Even though it requires legal + ToS review before activation, have the scaffolding ready so it can be turned on in hours, not weeks.
- Attribution: queue-times.com requires "Powered by Queue-Times.com" prominently in the app (their stated requirement). themeparks.wiki requests credit. Build these into the About screen from day 1.

**Warning signs:**
- Ingestion lag metric missing from monitoring dashboard.
- `fetched_at` not stored on wait-time records.
- No alert when the ingestion worker silently processes 0 records (a fully failed fetch may return an empty array, not an error).
- Solver accepting wait times without checking data freshness.

**Phase to address:** Phase 2 (data pipeline), ongoing monitoring.

---

### Pitfall 6: LLM Cost Blowout — Context Growth and Cache Invalidation

**Severity:** HIGH

**What goes wrong:**
The project targets p95 ≤ $0.20 per generated plan. Common failure modes that blow past this:

1. **Prompt cache invalidation**: Even a single dynamic token (timestamp, trip ID) inserted before the large static system prompt breaks caching, causing a full uncached read on every call. In production (2025), a documented bug in Claude Code caused cache read rates to collapse from 97-99% to 4.3%, spiking per-message costs from $0.02 to $0.35. The same failure mode applies to direct API usage if the prompt is not structured with the static prefix first and dynamic content at the end.

2. **Context growth**: If the LLM call includes the full solver output (a multi-day schedule with time blocks for 4-7 days) as context, plus the attraction catalog, plus historical narrative examples, the input token count grows linearly with trip length. A 7-day trip with a rich catalog context can easily push 50K+ input tokens per generation on Sonnet-class models.

3. **Regeneration loops**: Users who "Rethink my day" repeatedly (especially power users stress-testing the app) each trigger a full LLM call. Without a per-user rate limit or a cost circuit breaker, a single heavy user can generate $5–10 of LLM costs in an afternoon.

4. **Haiku/Sonnet model selection errors**: If the model selector defaults to Sonnet for all operations instead of routing cheap narrative tasks to Haiku, costs are 5-8x higher than necessary.

**How to avoid:**
- Structure prompts as: [large static system prompt → cache boundary → small dynamic user context]. Never put dynamic content before the static prefix.
- Track and log `cache_read_input_tokens` vs `input_tokens` from every Anthropic API response in the `llm_costs` table. If cache hit rate drops below 70%, alert immediately.
- Separate the solver (deterministic, no LLM cost) from the narrative layer (LLM). Only call the LLM for the narrative pass; the time-block schedule itself comes from the solver.
- Truncate solver output before passing to the LLM: the LLM does not need raw schedule data structures, only the human-readable summary.
- Per-trip soft cap: if estimated token cost for a single plan generation exceeds $0.50, fall back to Haiku or refuse and alert.
- Per-user daily regeneration limit: 5 "Rethink my day" calls per day in free tier, 15 in paid. Log and alert at 10 calls from a single user in one day.
- Monitor the `llm_costs` table from day 1 of any beta testing, not just from launch.

**Warning signs:**
- `cache_read_input_tokens` ratio below 80% in normal operation.
- P95 per-plan cost trending above $0.15 in testing (leaves only $0.05 margin before the budget breaks).
- A single user showing 10+ plan generations in one session in logs.
- Error logs showing any dynamic variable injected before the `<system>` block.

**Phase to address:** Phase 3 (solver + LLM integration), monitored continuously from Phase 3 onward.

---

### Pitfall 7: Solver Producing "Technically Optimal but Humanly Wrong" Plans

**Severity:** HIGH

**What goes wrong:**
A deterministic solver optimizes on a metric (minimize total wait time, maximize rides seen). It produces plans that are mathematically valid but experientially wrong. Documented failure patterns:

1. **Child fatigue timing**: Families with young children (ages 3–6) hit a wall at 1–2 PM, not at the end of the day. A solver that does not model child fatigue will schedule the hardest walk or the longest queued ride at 1 PM. The family melts down. They report the app "ruined our trip."

2. **ECV/wheelchair routing**: Electric Conveyance Vehicles and wheelchairs use different queues at many WDW attractions (DAS, alternative entrances). The solver must account for different effective wait times for ECV guests. A plan that routes an ECV user through the standard optimized path will have them walking past the ECV entrance repeatedly.

3. **Fireworks vs. dinner collision**: The solver may schedule an ADR (Advanced Dining Reservation) dinner at 9:15 PM on a Magic Kingdom day when EPCOT Harmonious fireworks are at 9:00 PM (or vice versa). Users will notice this; it is an obvious plan quality failure.

4. **Show/parade overlap**: Scheduling a ride with a 30-min estimated wait starting at 2:45 PM during a Festival of Fantasy parade route that closes paths at 3 PM. The guest cannot get to the ride.

5. **Rope-drop distance**: Routing a guest to be at the back of the park at rope drop instead of at the single highest-demand ride (like Tron or Guardians of the Galaxy) is a trust-destroying mistake for any informed WDW visitor.

6. **Park hopper timing**: If the user has a hopper pass, the solver must enforce Disney's rule that you cannot enter a second park before 2 PM. Plans that ignore this result in rejection at the gate.

**Why it happens:**
Solvers are built incrementally. Each constraint is added as it is discovered. Child fatigue, ECV routing, show schedules, and parade path closures are not core algorithm concerns — they are domain knowledge that must be explicitly encoded. The solver will not discover these problems itself; they surface in beta testing when real families try the app.

**How to avoid:**
- Encode rest block scheduling as a first-class constraint, not a post-processing step. Guest profiles with children under age 7 must inject a mandatory "rest / nap block" from 1–3 PM that the solver cannot route over.
- ECV/wheelchair is a solver profile variant. ECV guests get a separate effective-wait-time multiplier per attraction based on actual DAS/ECV queue data (gather this manually during Phase 2 catalog build).
- Fireworks and major shows must be in the catalog as high-priority fixed events. The solver should route around them, not through them. Create show_events table with start time, location, and path_closure_impact flag.
- Parade route closures are fixed temporal constraints in the walking graph (edges become impassable during parade windows).
- Build a snapshot test suite of known-good plans for canonical trips: family with toddler (3-day Magic Kingdom + Epcot + Hollywood Studios), young couple (park hopper, 2 days), accessibility user with ECV (1 day Animal Kingdom). Any solver change that degrades these canonical plans must be reviewed before shipping.
- The private beta (Phase 10) should include at least 5 families with children under 8 and at least 2 ECV users.

**Warning signs:**
- Canonical test trip snapshot shows the rest block scheduled after 3 PM for a family with a 4-year-old.
- ECV user sees 5+ rides flagged as "standard queue" when DAS alternatives exist.
- Any generated plan that schedules a ticketed event or fireworks at the same time as a dining reservation.
- Beta feedback with the phrase "the plan just doesn't make sense" without a specific complaint — this usually signals a fundamental routing error rather than a minor inconvenience.

**Phase to address:** Phase 3 (solver architecture), Phase 5 (iOS integration and manual QA with real plans), Phase 10 (beta with real families).

---

### Pitfall 8: Wait-Time Forecast Cold Start — Shipping Bad Predictions

**Severity:** HIGH

**What goes wrong:**
The v1 forecast model is a statistical baseline: bucketed median by ride × day-of-week × hour × crowd level. With less than 8 weeks of historical data, the model has sparse samples for each bucket. Early users get confidently wrong predictions. A first-time Disney visitor plans their entire trip around a forecast that says Space Mountain is 20 minutes at 10 AM on a Saturday in July. It is actually 75 minutes. They miss half the rides they planned. They leave a one-star review. This is reputationally damaging in a domain where trust is the entire product.

**Why it happens:**
The plan correctly identifies the cold-start risk and the mitigation (start ingesting from Phase 2, ship after 8+ weeks of data). The failure mode is pressure to ship earlier, or miscalculating how much data is "enough." Eight weeks of daily collection gives you approximately 56 data points per bucket per hour per day-of-week. This is statistically borderline — enough for a rough median, not enough for a reliable confidence interval.

**How to avoid:**
- Begin data ingestion on the first day Phase 2 is complete, not on launch day. Every day of ingestion before launch is data.
- Display explicit confidence labels on every forecast: "Based on 12 weeks of data — HIGH confidence" vs "Based on 3 weeks of data — LOW confidence." Make confidence labels part of the UI spec from Phase 3, not a post-launch addition.
- In early launch, seed the model with publicly available TouringPlans historical data or similar public datasets to bootstrap. They publish historical data — verify terms for commercial use before ingesting.
- For rides with sparse data, fall back to the crowd-level bucket median rather than the ride-specific model. Admit uncertainty.
- Consider labeling the forecast feature in the first 60 days post-launch as "Beta Forecast" with explicit copy: "Our predictions improve as we collect more data. Check back for sharper estimates after your visit."
- Set up an A/B test on confidence label visibility. Users who see explicit confidence labels report higher satisfaction even when predictions are wrong — honesty manages expectations.

**Warning signs:**
- Forecast model in testing shows bucket sample counts below 20 for any ride × day-of-week × hour combination.
- Any plan generation where the solver uses a forecast with a sample count below 10 without surfacing uncertainty to the user.
- First week of beta: users asking "how do you know the wait will be 25 minutes?" — this signals the confidence communication is insufficient.

**Phase to address:** Phase 2 (start ingestion immediately), Phase 3 (confidence label architecture), Phase 10 (verify 8+ weeks of data before opening public beta).

---

## High Severity Pitfalls

### Pitfall 9: COPPA Violation — Children's Data in Guest Profiles

**Severity:** HIGH (potential $50K+ per-day fines; FTC enforcement pattern escalating in 2025)

**What goes wrong:**
Guest profiles include children's ages (and possibly birth dates for height-restriction checking). Under COPPA (amended, effective April 22, 2026 compliance deadline), any app that collects data that can be inferred to relate to children under 13 — even if the account is held by the parent — must comply with COPPA requirements. The FTC's 2024-2025 enforcement expanded to cover "data about children held in adult accounts." In September 2024, the FTC settled with Disney itself over mislabeled child-directed YouTube videos. The HoYoverse (Genshin Impact) settlement was $20M for COPPA violations.

**Why it happens:**
The "guest profile is a trip attribute on the owner's account, not a child account" interpretation is a valid legal structure — it is how the project is designed. But this defense holds only if: (1) you do not use children's ages for targeting, behavioral analysis, or advertising; (2) you do not share child-age data with third parties; (3) you delete child data when the parent deletes the account; and (4) PostHog analytics events do not include child-age parameters that could be used to build behavioral profiles.

**How to avoid:**
- Store age ranges (e.g., "child under 7", "child 7-12") in guest profiles where possible, not exact birthdates. The solver needs age brackets, not birthdates, for height restriction and fatigue modeling.
- If you need exact birthdates for height restrictions (which you likely do not — a "child under 40 inches" flag is sufficient), mark the field with explicit purpose limitation and ensure it is deleted in the account deletion flow.
- PostHog events must never include child ages as event properties. Use anonymized age bracket codes (`guest_type: "child_under_7"`) only for solver inputs, never in analytics payloads.
- The account deletion endpoint must cascade-delete all guest profiles and their age data.
- Privacy policy must explicitly address children's data: "Guest profiles you create for children under 13 are associated with your adult account. We do not create profiles for children, target children with advertising, or share children's information with third parties."
- No push notifications should be targeted based on children's ages or trip content (e.g., "Your toddler will love this" notification — this implies profiling a child).
- Do not build a "child mode" or any UI that is directed at children directly. The app is for adult trip planners.

**Warning signs:**
- PostHog event logs contain raw age values for child guests.
- Account deletion flow does not remove guest profile age data.
- Any marketing copy or App Store description says "great for families with kids" in a way that implies the app is directed at children.
- The privacy policy has no mention of children's data handling.

**Phase to address:** Phase 1 (data model design — store age ranges not birthdates), Phase 4 (backend data model and deletion API), Phase 8 (privacy policy), Phase 10 (compliance review with IP lawyer).

---

### Pitfall 10: Solo Founder Platform Parity Drift — Android as Afterthought

**Severity:** HIGH

**What goes wrong:**
The plan correctly sequences platforms (iOS first, Android second) with OpenAPI-generated clients to enforce parity. The failure mode is subtler: the generated client code is correct, but the Android experience diverges in quality. Common patterns:
- iOS gets polish passes (micro-animations, haptics, correct loading states) that are never ported to Android.
- Android-specific patterns (Material You dynamic color, back gesture handling, Android notification channels) are not implemented because the iOS developer does not know Android.
- Android CI is added late, so test debt accumulates silently.
- "Works on simulator" but a real Pixel 7 with variable network drops the connection in a way the emulator never shows.
- The Android app ships 4 weeks after iOS, creating an "Android users are second-class" perception that is hard to recover from in reviews.

**Why it happens:**
One person cannot hold both platforms simultaneously in their head. AI coding agents help but do not catch platform-specific UX errors unless explicitly prompted to check them. The OpenAPI client gives API parity but not UX parity.

**How to avoid:**
- Define a per-feature parity checklist before Phase 7 begins. Every iOS feature has a named Android equivalent. When Phase 7 ships a feature, a reviewer explicitly verifies the Android implementation on a real device (not just emulator).
- Run Android CI from Phase 7 day 1, not "when we're closer to launch." Accumulated CI debt is a multi-day fix at the worst possible time.
- Device testing: run the Android app on at least a Pixel and a Samsung device before any beta. Samsung One UI has known differences in notification behavior, back gesture handling, and keyboard avoidance.
- Android notifications use explicit notification channels from Phase 7. Missing this causes all notifications to appear as "uncategorized" in Android 8+, which users disable in bulk.
- The `kotlin-specialist` agent must be explicitly prompted to check Android-specific UX patterns on every PR, not just Kotlin correctness.

**Warning signs:**
- Android app screenshots are identical to iOS screenshots without platform-appropriate adaptation (no status bar treatment differences, no bottom navigation bar handling).
- Android-specific Play Store reviews mentioning crashes on real devices that do not appear in emulator testing.
- CI badge for Android is absent or broken in the monorepo.

**Phase to address:** Phase 7 (Android build), with parity checklist defined in Phase 5 (iOS) so parity requirements are known before Android begins.

---

### Pitfall 11: Offline-First State Machine Corruption

**Severity:** HIGH

**What goes wrong:**
Users are in the park with zero or flaky signal. Several states can corrupt:

1. **Stale live data displayed as current**: The app shows a wait time it fetched 3 hours ago as if it is live. The user believes the data is current and makes a bad routing decision.
2. **Failed purchase, partial entitlement**: User taps "Unlock Trip," the StoreKit transaction completes on device, but the RevenueCat webhook to the backend fails due to no connectivity. The user paid but the server does not know — their trip stays locked when they reconnect.
3. **Offline plan generation**: User attempts "Rethink my day" in the park with no connectivity. The solver call fails because it needs the backend. The app shows an error at the worst possible moment.
4. **SwiftData / Room sync conflict**: User edits a trip on their phone (offline) and also on another device (online). When they reconnect, there are two versions of the plan. The conflict resolution is unclear.

**How to avoid:**
- Display data freshness timestamps on all live-data elements: "Wait times from 14 minutes ago." Never show wait time data without a freshness indicator.
- RevenueCat's SDK handles purchase recovery on reconnect — but only if you correctly call `restorePurchases()` at app launch. Implement this explicitly.
- "Rethink my day" should run the solver offline using cached plan state + cached wait-time snapshot. The LLM narrative layer can be skipped offline (show "narrative unavailable offline, plan is updated"). The solver itself must run on-device or against a cached snapshot.
- For conflict resolution, the plan is the authoritative record. "Last writer wins" with a `modified_at` timestamp is sufficient for v1. Make this explicit in the data model.
- Test offline scenarios explicitly: put the device in airplane mode after downloading a trip, verify all plan views load, verify "Rethink my day" degrades gracefully, verify wait time staleness is indicated.

**Warning signs:**
- No `fetched_at` timestamp displayed to users on any live data element.
- Purchase flow does not handle the case where StoreKit succeeds but the backend receipt validation call fails.
- "Rethink my day" crashes or shows a generic error when offline instead of a degraded-mode plan update.

**Phase to address:** Phase 5 (iOS offline architecture), Phase 6 (iOS paywall and StoreKit), Phase 7 (Android parity).

---

### Pitfall 12: RevenueCat Consumable IAP Edge Cases

**Severity:** MEDIUM-HIGH

**What goes wrong:**
Consumable IAPs in RevenueCat have different semantics than subscriptions and non-consumables:

1. **No automatic refund detection**: RevenueCat detects subscription refunds automatically via Apple's server notifications. Consumable refunds require explicit In-App Purchase Key configuration in RevenueCat, and the integration is webhook-only — you must handle the `REFUND` event in your backend and revoke entitlement manually.
2. **Family Sharing ambiguity**: Apple Family Sharing allows family members to access non-consumable purchases. Consumables are excluded from family sharing by default — but this must be explicitly configured in App Store Connect. If misconfigured, one purchase can unlock all family members' trips without additional revenue.
3. **Sandbox vs. production behavior differences**: Consumable refunds cannot be tested in the StoreKit sandbox environment. This means the refund handling code path is untested until production.
4. **Receipt-less reconnection**: If a user reinstalls the app, consumables are gone — there is no "Restore Purchases" for consumables. Users who reinstall and expect their trip to still be unlocked will contact support angry. Your backend must be the source of truth for trip entitlements, not the StoreKit receipt.

**How to avoid:**
- The backend (Supabase, `entitlements` table) is the single source of truth for trip unlock status. RevenueCat is the validation layer, not the record.
- Implement the RevenueCat webhook for `NON_RENEWING_SUBSCRIPTION_PURCHASE` and `REFUND` events. For refunds, revoke the entitlement and surface a clear "your trip plan has been refunded" message.
- In App Store Connect, verify Family Sharing is explicitly disabled for the consumable SKU.
- In the app, "Restore Purchases" should restore from the backend entitlement record, not from StoreKit. A user who reinstalls can sign in and recover their unlocked trips because the server has the record.
- Write integration tests for the refund webhook path even though you cannot test it in sandbox — test it with a mocked RevenueCat payload.
- Document the sandbox limitation explicitly in your test plan so you are not surprised by refund handling issues in production.

**Warning signs:**
- Entitlement table in Supabase has no corresponding webhook handler for refund events.
- "Restore Purchases" button in the app calls StoreKit restore (which does nothing for consumables) instead of calling the backend entitlement API.
- Family Sharing configuration in App Store Connect not explicitly reviewed.

**Phase to address:** Phase 4 (entitlement service backend), Phase 6 (iOS StoreKit integration), Phase 7 (Android Google Play Billing parity).

---

## Moderate Pitfalls

### Pitfall 13: Push Notification Fatigue and Platform Rejection

**Severity:** MEDIUM

**What goes wrong:**
"Walk to X now" notifications are high-value when timed well and toxic when timed wrong. A notification that fires at 11:30 PM ("Start heading to EPCOT's France pavilion for the 12:00 AM fireworks") when the family has left the park is immediately reported as spam. Studies show 10% of users turn off the app and 6% uninstall when they receive too many notifications. 64% stop using an app after 5+ push notifications per week. Apple may reject an update if the app's notification patterns generate a high opt-out rate.

**How to avoid:**
- Default notification budget: max 3 notifications per park day.
- Never send a "walk to X now" notification outside park hours for that user's current trip day.
- Include time-of-day guard: no notifications after 10 PM or before 7 AM local time (use the park's timezone, not device timezone for this calculation).
- "Walk to X now" must be tied to a specific schedule event that is still in the future and the user has not manually dismissed.
- Allow per-notification-type opt-out in settings (Lightning Lane reminders on/off, "walk to X" on/off) from day 1.
- Use PostHog to track notification open rates and disable rates. If a user mutes a notification type, never send that type again without explicit re-opt-in.
- Test notifications on real devices in the park during Phase 10 beta — emulator testing does not reveal the actual in-park experience.

**Warning signs:**
- Notification opt-out rate above 30% in the first week post-launch.
- Support tickets mentioning "I got a notification at midnight."
- PostHog showing notifications sent to users who have already left the park for the day.

**Phase to address:** Phase 5 (iOS notification architecture), Phase 9 (Live Activities / advanced notification features).

---

### Pitfall 14: Generic SaaS / "AI Slop" Aesthetics

**Severity:** MEDIUM

**What goes wrong:**
Disney-adjacent apps cluster into two failure modes: (1) trying to look like Disney (fake magic castle vibes, Mickey-colored gradients, unauthorized character art) and getting C&D'd; (2) looking like a generic SaaS product (Inter font, purple gradients, feature-grid landing pages, empty-state screens that look like Notion). Either destroys the "feels like a Disney expert made it for them" promise. The second failure is the more likely one for a solo founder using AI-generated UI — LLMs default to SaaS patterns.

**How to avoid:**
- The `ui-ux-designer` agent already has explicit anti-generic-SaaS anti-patterns wired in. Use it on every UI surface — do not skip the critique pass to save time.
- Brand direction must be locked before any UI component is built. The three explorations (vintage travel poster, warm modern minimalism, painterly whimsy) should be reviewed and decided in Phase 1 or 2, not Phase 8.
- Typography: explicitly rule out Inter, Roboto, Open Sans, Lato in the design token system. These are the markers of generic SaaS.
- The plan view (the core product moment) must feel warm and handcrafted. Use illustration-style icons, not generic SF Symbols or Material Icons defaults. Commission or source a small set of park-specific icons (carousel horse, castle, rocket, safari hat).
- Affiliate links must be contextually embedded, not rendered as banner ads. "You might want to pack this for the rain forecast on Day 2 →" not a yellow "BUY NOW" button.

**Warning signs:**
- Design review by `ui-ux-designer` agent returns "this looks like Notion / Linear / generic SaaS product."
- Typography audit finds Inter or Roboto in any primary text.
- App Store screenshots could be mistaken for a task manager or project management app.

**Phase to address:** Phase 1 (brand direction decision), every UI phase (5, 7, 8) with explicit `ui-ux-designer` critique pass.

---

### Pitfall 15: Affiliate Link Spam Appearance

**Severity:** LOW-MEDIUM

**What goes wrong:**
A packing list filled with Amazon affiliate links, shown to every user regardless of context, reads as an ad-supported app. Users feel manipulated. App Store reviewers may flag it under Guideline 3.2.2 ("facilitating sales of goods and services through your app" requires appropriate metadata). If the affiliate links have no contextual relevance (showing rain ponchos to users visiting in December on a no-rain-forecast trip), users experience it as spam.

**How to avoid:**
- Every affiliate link must be justified by trip context: rain forecast → ponchos; July heat → cooling towel; youngest guest age 3 → stroller fan; first visit → park map holder.
- The packing list generation should run through the same trip-context model as the rest of the plan — it is not a static product list.
- Disclose affiliate relationship clearly: "Some packing list items include affiliate links — WonderWaltz earns a small commission at no cost to you."
- Do not show packing list items for products that are available inside the park (Disney sells merch — recommending an Amazon version of something they sell at the park creates trust issues).

**Warning signs:**
- Packing list is identical for a December trip and a July trip.
- Packing list shows products unrelated to the guest profile (no children in the party, yet recommends stroller accessories).
- User reviews mentioning "feels like an ad."

**Phase to address:** Phase 4 (packing list service, context-driven item selection), Phase 5 (iOS UI for packing list).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding park hours in the app binary instead of from the API | Zero ingestion needed | Hours change frequently; app is wrong every time a park modifies hours for special events | Never — park hours must always come from the data source |
| Skipping data freshness timestamps on wait-time records | Simpler data model | Silent stale data corruption; solver uses old data as if current | Never |
| Using a single LLM prompt for all plan lengths (1-day to 7-day) without truncation | Simpler code | Token count grows linearly with trip length; hits context limits on 7-day plans; costs blow up | Only in early prototyping; must be fixed before beta |
| Not implementing the `REFUND` RevenueCat webhook in v1 | One less integration | Users get refunds and keep trip access; refund abuse possible; support tickets when access is revoked manually | Never — implement from Phase 4 |
| Android CI added "after we know the iOS is solid" | Saves a sprint in the short term | Accumulated Android-specific bugs discovered at launch when they are expensive to fix | Never — CI must be day-1 for each platform |
| Storing exact child birthdates in guest profiles "for precision" | Slightly more accurate height restriction checking | COPPA violation risk; no material benefit over age-bracket storage | Never — store age brackets, not birthdates |
| Skipping the IP lawyer review "just for beta" | Saves $2-5K | Beta users share the app, it goes wider, Disney IP lawyers discover it in beta posture — now you have no legal review behind you | Never — lawyer review before any public exposure |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| queue-times.com | Treating HTTP 200 with an empty wait-times array as a successful fetch | Check that the returned array has > N records expected for the park; empty arrays can indicate a silent upstream failure |
| themeparks.wiki | Not implementing fallback when the primary source returns stale data | Cross-validate freshness: if both sources return data older than 30 minutes, alert and fall back to historical medians |
| Claude API | Putting dynamic content (trip ID, timestamp) before the static system prompt in the message | Always put static system prompt first with `cache_control: {"type": "ephemeral"}` at the prompt boundary; dynamic content at the end |
| RevenueCat (consumable) | Calling `restorePurchases()` and expecting to recover trip unlocks | Restore from the backend entitlement table; RevenueCat consumable receipts do not restore on reinstall |
| StoreKit 2 | Testing the full purchase and refund flow only in sandbox | Sandbox does not support consumable refund events. Design the refund webhook handler and test it with mock payloads |
| Supabase RLS | Assuming anonymous accounts have the same RLS policies as authenticated accounts | Anonymous accounts in Supabase Auth need explicit RLS policies; the anonymous → authenticated account merge must not orphan trip data |
| PostHog | Including child guest ages in event properties for solver analytics | Use opaque age-bracket codes only; never log raw child ages to any analytics service |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Ingesting raw wait-time events directly into the query path | Plan generation slows as historical data grows | TimescaleDB continuous aggregates roll up data at ingest time; the solver queries aggregates, never raw events | After ~2 months of 5-minute polling (~17K records per ride) |
| Full catalog passed to the LLM as context for every plan | Token costs grow with catalog size; approaching context limits on 7-day plans | Pass only the relevant subset (rides/dining in the plan, not the full 500-attraction catalog) | At ~200+ attractions in context |
| No Redis cache on the plan-generation endpoint | Every user request triggers a new solver + LLM call | Cache generated plans by (trip_id + last_modified_at) for 15 minutes | At 50+ concurrent plan generation requests |
| SwiftData / Room sync triggering on every solver output field change | UI janks on plan update; battery drain | Diff the plan output before writing to local storage; only persist changed time blocks | From day 1 on lower-end Android devices |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Disney account credentials if a user accidentally enters them in a trip field | Privacy nightmare; trust destruction; possible MDE ToS violation | Detect and reject Disney.com email patterns in trip note fields; explicitly warn in UX; never store this data |
| Exposing trip entitlement check via client-side only (no server validation) | Users bypass the paywall by modifying local state | Entitlement must always be validated server-side on the backend; client-side is a UI hint only |
| Using user-provided trip notes as context in LLM prompts without sanitization | Prompt injection; users may extract system prompt or manipulate plan generation | Sanitize free-text fields before inclusion in LLM context; set explicit role boundaries in prompts |
| Logging full plan payloads (including guest ages, mobility status) to Sentry | PII in error monitoring | Scrub guest profile fields from Sentry event payloads; log plan IDs, not plan contents |

---

## "Looks Done But Isn't" Checklist

- [ ] **Offline plan view**: Often missing data-freshness timestamps — verify every wait time element shows a "data from X minutes ago" indicator when offline.
- [ ] **Trip unlock paywall**: Often missing the edge case where StoreKit succeeds but the backend call fails — verify the purchase recovery path on reconnect.
- [ ] **Account deletion**: Often missing the guest profile cascade delete — verify that deleting an account removes all trip, plan, and guest data including age fields.
- [ ] **App Store metadata**: Often missing the check that "Disney," "Magic Kingdom," "Epcot," etc. are not in the keyword field — verify in App Store Connect before submission.
- [ ] **Disclaimer**: Often missing from one surface — verify it appears in app settings, about screen, App Store description, Play Store description, and every web page.
- [ ] **Notification timing guard**: Often missing the park-hours guard on "walk to X" notifications — verify no notification fires outside park hours.
- [ ] **LLM cache structure**: Often missing the cache boundary placement — verify `cache_read_input_tokens` rate is above 80% in staging.
- [ ] **Refund webhook**: Often missing until production refunds start happening — verify the RevenueCat `REFUND` webhook handler exists and is tested.
- [ ] **Child data in analytics**: Often added accidentally when debugging — verify PostHog events contain no raw child age values.
- [ ] **ECV routing**: Often missing until an accessibility-focused beta user catches it — verify at least one test plan is generated for a guest with ECV mobility flag and reviewed manually.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Disney C&D | EXISTENTIAL — months | Remove all flagged content immediately; engage IP lawyer; respond within C&D deadline; negotiate; may require rebranding if name is the issue |
| App Store rejection (metadata) | LOW (1–3 days) | Remove trademarked keywords from metadata; resubmit with updated review notes; 24-48 hour re-review typical |
| App Store rejection (IAP classification) | MEDIUM (1–2 weeks) | Restructure IAP type (consumable → non-consumable or vice versa); update backend entitlement logic; resubmit with detailed review notes |
| LLM cost blowout | MEDIUM (days) | Emergency: enable Haiku-only mode via feature flag; reduce context window in prompt; add hard per-trip cost cap; diagnose cache invalidation bug |
| Data source outage | LOW (hours) | Automatic failover to secondary source (should be pre-built); if both down, fall back to historical medians with user-visible staleness warning |
| Solver bad plan (post-launch) | HIGH (trust loss) | Emergency hotfix for the specific constraint; retroactively regenerate affected plans; proactive outreach to beta users who reported the issue |
| COPPA violation discovery | HIGH (compliance + fines) | Immediate data deletion for affected records; privacy policy update; FTC disclosure if required; compliance remediation plan |
| RevenueCat refund not detected | MEDIUM (days) | Implement webhook handler; audit all refunded consumables in App Store Connect; manually revoke entitlements for confirmed refunds |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Disney C&D / IP infringement | Phase 0 (name check), Phase 1 (disclaimer wiring), Phase 10 (IP lawyer review) | IP lawyer sign-off is a hard gate. Every surface has the disclaimer. Zero Disney imagery in any screenshot or asset. |
| App Store metadata trademark violation | Phase 10 (listing creation) | Keyword field audit: none of Disney, Magic Kingdom, Epcot, Hollywood Studios, Animal Kingdom |
| Consumable IAP classification | Phase 4 (entitlement design), Phase 6 (iOS IAP), Phase 10 (review notes) | App Store review notes explain the unlock model; consumable type chosen based on legal/technical review |
| Data source fragility | Phase 2 (ingestion) | Ingestion lag alert firing in staging; failover to secondary tested in simulation |
| LLM cost blowout | Phase 3 (solver+LLM), ongoing | `cache_read_input_tokens` rate > 80%; p95 cost per plan < $0.20 in staging load test |
| Solver wrong plans | Phase 3 (constraint encoding), Phase 5 (manual QA), Phase 10 (beta) | Snapshot tests pass for 5 canonical trip types; beta includes ECV users and families with toddlers |
| Forecast cold start | Phase 2 (ingestion start), Phase 3 (confidence labels) | 8+ weeks of data before public beta; confidence labels visible in UI |
| COPPA child data | Phase 1 (data model), Phase 4 (deletion API), Phase 8 (privacy policy) | Privacy policy addresses children's data; PostHog events contain no raw child ages; deletion cascade verified |
| Android parity drift | Phase 7 (Android), parity checklist from Phase 5 | Parity checklist completed; device testing on real Pixel and Samsung; Android CI green before beta |
| Offline state corruption | Phase 5 (iOS offline), Phase 6 (StoreKit recovery) | Airplane-mode test suite passes; purchase recovery on reconnect tested |
| RevenueCat consumable edge cases | Phase 4 (webhook), Phase 6 (StoreKit) | Refund webhook handler tested with mock payload; family sharing disabled on SKU in App Store Connect |
| Push notification fatigue | Phase 5 (notification architecture) | Default 3/day cap enforced; park-hours guard in place; per-type opt-out available |
| Generic SaaS aesthetics | Phase 1 (brand lock), every UI phase | `ui-ux-designer` agent critique pass on every UI surface; typography audit passes (no Inter/Roboto) |
| Child data in analytics | Phase 1–ongoing | PostHog event audit; no raw age values in any event property |

---

## Sources

- Disney C&D to Character.AI: [Variety, September 2025](https://variety.com/2025/digital/news/disney-character-ai-cease-desist-letter-remove-characters-1236536217/)
- Disney C&D to ByteDance/Seedance: [Disney by Mark, February 2026](https://disneybymark.com/2026/02/news-disney-accuses-bytedance-of-hijacking-characters-in-cease-and-desist-letter/)
- Apple Guideline 2.3.7 (keyword metadata): [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple Guideline 5.2.1 (IP/trademark): [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [ShopApper analysis](https://shopapper.com/fix-app-store-metadata-rejection-guideline-5-2-1-2-3-7/)
- Apple external payment rules 2026: [RevenueCat blog](https://www.revenuecat.com/blog/growth/apple-anti-steering-ruling-monetization-strategy/), [Neon Pay](https://www.neonpay.com/blog/apple-app-store-alternative-payment-fees-what-developers-pay-in-2026)
- COPPA 2025 amendments (effective April 22, 2026): [Loeb & Loeb](https://www.loeb.com/en/insights/publications/2025/05/childrens-online-privacy-in-2025-the-amended-coppa-rule), [FTC](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)
- FTC v. HoYoverse COPPA settlement ($20M): [State of Surveillance](https://stateofsurveillance.org/news/coppa-2026-new-rules-children-privacy-biometric-data/)
- FTC v. Disney mislabeled YouTube videos: Confirmed in COPPA enforcement search, September 2024
- TouringPlans accuracy controversy: [WDWMAGIC forums](https://forums.wdwmagic.com/threads/is-touring-plans-remotely-accurate-anymore.973152/)
- TouringPlans accuracy study: [TouringPlans blog](https://touringplans.com/blog/how-accurate-are-our-wait-time-estimates-theres-a-spreadsheet-of-course/)
- LLM prompt cache invalidation bug (Claude Code, March 2025): [Kilo Blog](https://blog.kilo.ai/p/usage-limits-were-just-the-beginning)
- Claude API prompt caching docs: [Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- RevenueCat consumable refund handling: [RevenueCat docs](https://www.revenuecat.com/docs/subscription-guidance/refunds)
- RevenueCat family sharing: [RevenueCat community](https://community.revenuecat.com/sdks-51/expected-behavior-for-family-sharing-6442)
- Push notification fatigue statistics: [ContextSDK](https://contextsdk.com/blogposts/avoiding-push-fatigue-common-user-turn-offs), [Pushwoosh](https://www.pushwoosh.com/blog/push-notification-statistics)
- queue-times.com API terms: [queue-times.com API page](https://queue-times.com/en-US/pages/api)
- themeparks.wiki API: [themeparks.wiki](https://themeparks.wiki/api)
- Disney trademark enforcement overview: [TrademarkRoom](https://trademarkroom.com/blog/item/disney-and-ip-how-are-the-characters-protected/), [EFF](https://www.eff.org/deeplinks/2025/09/fair-use-protects-everyone-even-disney-corporation)

---
*Pitfalls research for: WonderWaltz — Disney WDW trip-planning app*
*Researched: 2026-04-09*
