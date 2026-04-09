# Feature Research

**Domain:** Disney World trip planning app — personalized itinerary generator with live wait-time data, hybrid solver + LLM narrative, and per-trip IAP
**Researched:** 2026-04-09
**Confidence:** MEDIUM-HIGH (competitive landscape from live sources; user sentiment from forums and reviews; no direct user survey data available)

---

## Competitor Landscape Summary

| Competitor | Core Differentiator | Weakness | Price |
|------------|---------------------|----------|-------|
| My Disney Experience (Disney) | Official integration, LL booking, MDE sync | Clinical, no personalization, phone-dependency anxiety | Free + LL purchase |
| TouringPlans Lines | Decades of crowd data, accurate wait-time predictions, crowd calendar | Dated UX, steep learning curve, app stability complaints on Android, hard to use with post-FP+ LL system | $24.97/yr |
| Park Autopilot | Simple AI plan in <60s, no account needed, low friction | Magic Kingdom only, no real-time updates | One-time purchase |
| RideMax | Granular optimizer, Lightning Lane integration, multi-day | Web-first, dated design, no narrative layer | Subscription |
| WDW Trip Planner Pro | Gantt view, MDE screenshot import, AI advisor (Claude), collaboration | Feature-heavy / complex, targets planners not first-timers | Unknown |
| Character Locator (Kenny the Pirate) | Character meet-and-greet schedules, show times | Narrow focus, outdated design | $7.99 |

**Gap WonderWaltz targets:** No competitor combines genuinely personalized (guest-profile-aware) day plans with human-warm narrative, live wait data, LL strategy, and a dead-simple first-timer UX at a sub-$15 one-time price.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features whose absence causes bounce or 1-star reviews. Marked **IN PLAN** when already in v1 scope, **MISSING** when absent.

| Feature | Why Expected | Complexity | Plan Status | Notes |
|---------|--------------|------------|-------------|-------|
| Day-by-day itinerary with time blocks | Every competitor offers this; first-timers need structure, not a list of tips | HIGH | **IN PLAN** | Core solver output |
| Live wait time display | MDE app, TouringPlans, every trip blog cite this as baseline; users trust third-party times more than Disney's inflated estimates | MEDIUM | **IN PLAN** | queue-times.com feed |
| Lightning Lane strategy and booking window reminders | LL complexity (LLMP 7-day vs 3-day, 7am booking, tap-in re-booking rule) is the #1 anxiety for first-timers. TouringPlans covers this; MDE handles booking. Users expect a planner to explain what to do and when | MEDIUM | **IN PLAN** | Push notifications + schedule blocks |
| Park hours and schedule (including Early Entry, Extended Evening Hours) | Users cross-reference park hours constantly; getting it wrong wastes rope-drop advantage | LOW | **IN PLAN** | themeparks.wiki / queue-times.com |
| Dining recommendation with meal timing | Dining is a top planning concern; every app addresses it; missing = incomplete planner | MEDIUM | **IN PLAN** | Slot in schedule; mobile order tag |
| On-property vs off-property differentiation | Resort guests get Early Entry + 7-day LL booking; off-site get 3-day window. A plan that ignores this is wrong for half its users | MEDIUM | **IN PLAN** | Trip wizard captures this |
| Guest profile / party composition | Age, height restrictions, mobility constraints. Every parent asks "what can my 3-year-old ride?" | MEDIUM | **IN PLAN** | Per-guest fields in wizard |
| Crowd level context | Users want to know if they picked a bad day; crowd awareness drives confidence in the plan | MEDIUM | **IN PLAN** (via wait-time forecast + bucket) | Implicit in solver; exposing label to user adds trust |
| Park selection recommendation (which park on which day) | First-timers don't know that Tuesday at EPCOT vs Saturday at Magic Kingdom are radically different | MEDIUM | **IN PLAN** | Solver suggests; user can override |
| Offline access | Parks have notoriously spotty LTE; TouringPlans, MDE both fail in dead zones. Users who paid for a plan expect to use it | HIGH | **IN PLAN** | Full trip cached on device |
| Ride/attraction details (height req, duration, thrill level, single-rider) | Users Google this constantly; any planner that doesn't answer "can my kid do this?" gets abandoned | LOW | **IN PLAN** | Catalog metadata |
| Show / parade / fireworks schedule integration | Nighttime shows are trip highlights; plans that ignore them feel incomplete. TouringPlans includes these | LOW | **IN PLAN** | themeparks.wiki scheduled entertainment |
| Weather awareness | Florida weather is unpredictable; a plan with no rain contingency feels brittle | LOW | **IN PLAN** | OpenWeather feed + packing list |
| Clear monetization expectation (what's free, what's paid) | If the paywall appears unexpectedly, trust breaks. TouringPlans is clear; Park Autopilot is clear. Users need to know before they invest time | LOW | **IN PLAN** | Day 1 teaser + blur model |
| Accessibility / WCAG compliance | Non-negotiable for families with disabilities, which are a meaningful portion of the WDW visitor base | MEDIUM | **IN PLAN** (WCAG 2.2 AA) | DAS-aware scheduling is separate (see Gap flags) |

**Verdict on table stakes coverage:** v1 plan covers all table stakes. No critical gaps found in this category.

---

### Differentiators (Competitive Advantage)

Features that set WonderWaltz apart. Ordered by strategic value.

| Feature | Value Proposition | Complexity | Competitor Gap | Notes |
|---------|-------------------|------------|----------------|-------|
| LLM narrative layer — warm, expert-voice per-item tips and budget hacks | Every other tool outputs lists and numbers. WonderWaltz outputs prose that feels hand-crafted. TouringPlans has data but no warmth. MDE has neither. Park Autopilot has neither | HIGH | No competitor | Core IP. Per-trip cost target ≤$0.20 p95 |
| Budget tier personalization (Pixie Dust / Fairy Tale / Royal Treatment) | Budget is the second most common user question after "what to do first." Zero competitors surface budget optimization as a first-class planning dimension. WDW Trip Planner Pro has a cost estimator but it's a separate tool | MEDIUM | No direct competitor | Drives LL spend, dining tier, snack budget, rest frequency |
| Solver + narrative separation (deterministic correctness + LLM warmth) | AI-only planners (booked.ai, generic ChatGPT) hallucinate ride names, cite closed attractions, give crowd-sourced guesses. WonderWaltz grounds narrative in solver-validated time blocks | HIGH | TouringPlans has solver but no narrative; AI tools have narrative but no solver | Core architectural advantage |
| "Rethink my day" on-demand re-optimization | Once in-park, plans break. TouringPlans Lines can re-optimize, but only if the user knows how to invoke it (high learning curve). WonderWaltz makes it a single tap | MEDIUM | TouringPlans is closest but UI is confusing | Depends on: live wait feed + solver |
| Live Activities / ongoing notification showing next plan item | No current Disney third-party planner offers persistent on-screen next-step guidance. Users want less phone time, not more. A glanceable Live Activity removes the need to keep the app open | MEDIUM | No competitor | iOS 16.2+ Dynamic Island + Lock Screen; Android ongoing notification |
| Per-trip $9.99 consumable (vs annual subscription) | Most Disney families visit once or twice a year. An annual subscription ($15–$25) feels wrong for a single trip. Pay-once matches the usage pattern and lowers the commitment barrier for first-timers | LOW | TouringPlans = annual; RideMax = subscription | RevenueCat consumable IAP |
| Guest-profile-aware constraint filtering | Plans that respect a toddler's height limits, a guest with mobility constraints, or a sensory-sensitive child without the user having to manually edit every suggestion. TouringPlans lets you exclude rides but doesn't model per-guest suitability | MEDIUM | TouringPlans partial (exclusion only) | Solver candidate set filtering per guest |
| Packing list tied to trip context | Weather-aware, youngest-guest-aware affiliate packing list. No competitor does this contextually — they offer generic lists | LOW | No competitor | Amazon Associates; OpenWeather + guest age drive curation |
| Countdown widget | Delightful pre-trip engagement; great App Store screenshot material; drives daily app opens before the trip | LOW | No competitor | iOS WidgetKit + Android Glance |
| On-property Early Entry strategy built into the plan | Plans that know the guest is at a Deluxe resort should prioritize rope drop correctly for the Early Entry window, not just park open. TouringPlans does this, but only if the user configures it correctly | LOW | TouringPlans: manual | Resort type from trip wizard |
| Rider Switch awareness in multi-age-group plans | If the party has a toddler who can't ride Tron, the plan should slot in rider switch naturally, not ignore the situation | MEDIUM | No competitor addresses this in the plan narrative | Requires per-guest constraint modeling |

---

### Anti-Features (Deliberately NOT Building)

Features that seem good but harm the product's legal posture, trust, scope, or core experience. This list is evidence-backed, not arbitrary.

| Feature | Why Requested | Why Harmful | What to Do Instead |
|---------|---------------|-------------|-------------------|
| In-app LL / dining / ticket booking | Users want one-stop-shop; reduces friction | Creates payment processing liability, Disney ToS exposure, legal complexity a solo founder cannot sustain. Trust risk if a booking fails | Deep-link directly to MDE app; explain exactly which button to tap and when |
| Disney account / MDE credential storage | Users want sync; seamless data import is appealing | Storing Disney passwords opens GDPR, CFAA, and Disney ToS violations. A credential breach would end the company | Recommend MDE as companion app; explain all booking steps in plain language in the plan |
| Social / shareable plan feeds | Users ask for "share with spouse" or "post my itinerary" | Adds moderation, content liability, follower graph complexity. Not the core value. Scope creep for a solo founder | Ship the v1.1 shareable read-only web trip view (already planned) — private share link, not a social feed |
| Crowdsourced wait times / user reporting | Power users love submitting waits; TouringPlans was built on this | Requires moderation, outlier filtering, contributor incentives, and ongoing trust calibration. queue-times.com already aggregates this better | Consume queue-times.com; let them handle the crowdsource complexity |
| Ad-supported free tier | Lowers price barrier to zero | Banner ads, interstitials, and sponsored itineraries destroy the "hand-crafted by an expert" brand positioning. The product's premium feel is the product | Affiliate packing list is the passive revenue lever; keep the plan ad-free |
| Real-time dining reservation availability | Users desperately want to know what's available | Requires scraping Disney's booking endpoint (ToS violation risk) or a polling partnership that doesn't exist yet. False positives damage trust massively | v1.1 dining watchlist with push alerts after IP lawyer review |
| Crowd-sourced restaurant reviews / ratings | Users want to know if a restaurant is good | Moderation liability; worse than existing resources (AllEars, TouringPlans, Yelp) that already do this well | Surface TouringPlans / AllEars ratings by deep link in dining recommendations |
| AI chatbot / open-ended Disney Q&A | Users love asking "what should I do?" | Open-ended LLM chat has unpredictable cost, hallucination risk on park-specific facts, and creates a support burden when the LLM is wrong about attraction status. It also blurs the product's value — the plan is the answer | The plan already answers the question. "Rethink my day" handles in-park pivots |
| Group / family account sharing with live plan sync | Multi-device live sync "so my husband can see the plan" feels essential | Real-time sync adds WebSocket infrastructure, conflict resolution, and significantly raises per-user server cost. For a $9.99 one-time purchase, this economics doesn't work | v1.1 shareable read-only web trip view covers 90% of this use case |
| Character meet-and-greet schedule tracking | Fan community feature; Character Locator exists for this | Low information density, schedule changes daily, requires its own data pipeline. Scope creep for a persona that cares about rides and efficiency | Point to Character Locator (Kenny the Pirate) in the plan narrative where relevant |
| PhotoPass / Memory Maker integration | Users want photos organized into the itinerary | Requires Disney API access (doesn't exist publicly). Any workaround would be scraping-adjacent. Zero reliable data source | Note PhotoPass locations in attraction tips (LLM narrative) without integration |

---

## Feature Dependencies

```
Trip Wizard (dates, guests, resort, prefs)
    └──required by──> Deterministic Solver
                          └──required by──> Day Plan output
                                               └──required by──> LLM Narrative Layer
                                                                     └──required by──> Plan view (mobile)
                                                                                           └──required by──> IAP paywall (Day 2+ unlock)

Live Wait-Time Feed (queue-times.com)
    └──feeds──> Deterministic Solver
    └──feeds──> "Rethink my day" re-optimization

Wait-Time Forecast (statistical baseline)
    └──feeds──> Deterministic Solver (when current live data unavailable)

Weather Forecast (OpenWeather)
    └──feeds──> Solver (rain contingency blocks)
    └──feeds──> Packing List curation

On-property flag + resort
    └──required by──> Early Entry window calculation
    └──required by──> LL booking 7-day vs 3-day window in notifications

Push Notifications (LL booking windows, "walk now")
    └──requires──> Completed plan with time-blocked LL slots
    └──requires──> On-property flag

Live Activities / Ongoing Notification
    └──requires──> Active park day (today's plan)
    └──requires──> Push notification permission granted

Offline Mode
    └──requires──> Catalog + plan + walking graph pre-cached at plan generation time

Countdown Widget
    └──requires──> Trip with start date set
    └──independent of──> IAP (shown in free tier)

Affiliate Packing List
    └──requires──> Weather forecast data
    └──requires──> Guest youngest-age field
    └──independent of──> IAP (can show in free tier as a hook)
```

### Dependency Notes

- **IAP unlock requires Day Plan**: the paywall moment is when the user sees Day 1 and wants Days 2+. The plan must be generated before purchase, not after.
- **LLM narrative requires solver output**: the narrative layer is grounded by the solver's time-blocked metadata. LLM runs after solver, not in parallel.
- **Offline mode requires pre-sync trigger**: the entire trip package (catalog subset, plan JSON, walking graph, static maps) must be downloaded on a reliable connection before the guest enters the park. The UX must prompt this explicitly.
- **Push notifications require plan time blocks**: LL booking reminders are tied to specific clock times derived from the solver. No plan = no notifications.
- **Rider Switch awareness requires per-guest constraint modeling**: must be built into the candidate set filtering, not bolted on later.

---

## MVP Definition

### Launch With (v1)

- [x] Trip wizard capturing all required inputs — gates everything downstream
- [x] Solver-generated day plan with time blocks, rides, meals, shows, rest, LL slots
- [x] LLM narrative layer on top of solver output (warm voice, per-item tips, budget hacks)
- [x] Free Day 1 teaser + blurred Days 2+, with IAP unlock at $9.99
- [x] Offline-first cached plan with catalog and walking graph
- [x] Push notifications for LL booking windows and "walk to X now"
- [x] Live Activities (iOS) / ongoing notification (Android) for next-item glance
- [x] Weather integration driving packing list and rain contingency blocks
- [x] Affiliate packing list with trip-context curation
- [x] Countdown widget
- [x] "Rethink my day" on-demand re-optimization
- [x] WCAG 2.2 AA accessibility baseline

### Add After Validation (v1.1)

- [ ] Dining reservation watchlist with push alerts — high user value, needs its own data source + IP lawyer review before building
- [ ] Shareable read-only web trip view — solves "show my family the plan" without building social features
- [ ] Apple Watch / Wear OS companion — glanceable next-item; needs platform-specific investment
- [ ] Crowd calendar public page — SEO magnet; solver already computes crowd index, exposing it is incremental
- [ ] Spanish + Portuguese localization — LATAM is a major WDW visitor base; strings externalized from day 1

### Future Consideration (v2+)

- [ ] ML-based wait-time forecast — revisit after 8+ weeks of historical data collected
- [ ] Multi-park resort support (Disneyland, Paris) — same engine, new catalog data
- [ ] Rider Switch planner UI — surface this explicitly when a guest-party split is detected; currently handled by narrative only
- [ ] "Best viewing spots" guide (fireworks, parade) — curated content layer, not a live-data feature; possible as editorial content within the plan narrative earlier
- [ ] Full trip cost estimator — demand is confirmed (multiple standalone calculators exist and are popular); integrates naturally with budget tiers; deferred because budget tiers already proxy for this

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Day plan generation (solver + LLM) | HIGH | HIGH | P1 |
| Trip wizard | HIGH | MEDIUM | P1 |
| IAP unlock (Day 1 teaser + blur) | HIGH | MEDIUM | P1 |
| Offline mode | HIGH | HIGH | P1 |
| Push notifications (LL windows) | HIGH | MEDIUM | P1 |
| Live Activities / ongoing notification | HIGH | MEDIUM | P1 |
| Live wait-time display in plan | HIGH | MEDIUM | P1 |
| Weather + packing list | MEDIUM | LOW | P1 |
| Countdown widget | MEDIUM | LOW | P1 |
| "Rethink my day" | HIGH | MEDIUM | P1 |
| Budget tier personalization | HIGH | LOW (in solver scoring) | P1 |
| Guest profile constraint filtering | HIGH | MEDIUM | P1 |
| Crowd level label (visible to user) | MEDIUM | LOW | P2 |
| Rider Switch narrative in plan | MEDIUM | LOW (narrative only) | P2 |
| Dining reservation watchlist | HIGH | HIGH | P2 (v1.1) |
| Shareable web trip view | MEDIUM | MEDIUM | P2 (v1.1) |
| Apple Watch / Wear OS | MEDIUM | HIGH | P3 |
| ML wait-time forecast | MEDIUM | HIGH | P3 |
| Full trip cost estimator UI | MEDIUM | MEDIUM | P3 |
| "Best viewing spots" editorial | LOW | LOW | P3 |

**Priority key:** P1 = v1 launch blocker, P2 = v1.1 after validation, P3 = v2+ or indefinitely deferred

---

## Competitor Feature Analysis

| Feature | TouringPlans | My Disney Experience | Park Autopilot | WonderWaltz Plan |
|---------|--------------|----------------------|----------------|------------------|
| Personalized day plan | Manual build | Disney Genie suggestions only | AI-generated, MK only | Solver + LLM, all 4 parks |
| Live wait times | YES (more accurate than MDE) | YES (inflated estimates) | NO | YES (queue-times.com) |
| LL strategy | YES (guidance articles) | YES (in-app booking) | NO | YES (in-plan slots + notifications) |
| Budget optimization | NO | NO | NO | YES (3 tiers, drives all decisions) |
| Narrative / warm voice | NO (data only) | NO | NO | YES (Claude narrative layer) |
| Offline mode | Partial (cached waits) | Partial (crashes in parks) | NO | YES (full trip cached) |
| Push notifications | NO | YES (some) | NO | YES (LL windows + walk-now) |
| Live Activities | NO | NO | NO | YES (iOS) |
| Guest constraints (age, mobility) | Ride exclusion only | Height req reference | NO | YES (per-guest profile, candidate filtering) |
| Crowd calendar | YES | NO | NO | In solver (not surfaced as calendar in v1) |
| Room/resort finder | YES (30k+ photos) | Booking only | NO | OUT OF SCOPE |
| Dining reservation tracking | NO direct | YES (MDE booking) | NO | v1.1 (watchlist) |
| Packing list | NO | NO | NO | YES (context-aware affiliate list) |
| Price | $24.97/yr | Free + LL purchase | One-time | $9.99/trip |
| Learning curve | HIGH | MEDIUM | LOW | Target: LOW |

---

## Gap Flags (Day-1 User Requests Not Covered by v1 or v1.1)

These are features users will ask for that are not currently scoped in v1 or v1.1. Each flag is a decision for the product owner — not an automatic build.

### GAP-1: DAS (Disability Access Service) Integration
**What users will ask for:** "We have a guest with autism/developmental disability — how does the plan account for DAS?" DAS allows guests to get return windows without physically waiting in line, functionally similar to LL. As of 2025, DAS eligibility changed (now primarily developmental disabilities, no longer physical disabilities), which increased anxiety for affected families. No competitor accounts for DAS in plan generation.
**Complexity:** MEDIUM — requires a DAS flag in trip wizard, and solver must model DAS return windows as a secondary resource constraint (similar to how it models LLMP bookings).
**Risk if ignored:** Parents of DAS-eligible children are a vocal, high-value audience. Getting DAS planning wrong in the narrative erodes trust. Getting it right is a genuine differentiator.
**Recommendation:** Add DAS as a guest-level flag in the trip wizard. The solver already models LL as a constraint — DAS return windows can be modeled the same way. Low marginal cost; high trust value.

### GAP-2: Full Trip Cost Estimator
**What users will ask for:** "How much will this trip cost?" Budget calculators are among the most-searched Disney content (multiple standalone tools: MagicCost Planner, Plan the Magic, Laugh & Gear, Disney in Your Day). Users want ticket + hotel + dining + LL spend in one number before they finalize a trip.
**Complexity:** MEDIUM — budget tiers already exist. A cost estimator surfaces the implied budget as a dollar range. Requires price data for hotels (by tier), LL purchases, dining tiers, and tickets.
**Risk if ignored:** Users will leave the app to use a standalone calculator. If they compare numbers and the WonderWaltz plan feels inconsistent with their budget reality, trust breaks.
**Recommendation:** Build a simple "estimated trip cost" summary screen after wizard completion, driven by budget tier + on/off property + guest count. Does not need to be a full spreadsheet — a range ($X–$Y) with category breakdown is enough. Consider for v1.1.

### GAP-3: "Best Viewing Spot" Guidance for Shows / Fireworks / Parades
**What users will ask for:** "Where should I stand to watch Happily Ever After?" This is among the most-Googled Disney planning questions. No app surfaces it contextually in the plan.
**Complexity:** LOW — this is editorial content, not a data feed. Can be handled entirely by the LLM narrative layer when shows/fireworks are scheduled in the plan. The solver assigns the show time block; the LLM adds the viewing spot tip.
**Risk if ignored:** Users who get a great plan but miss the best fireworks view will attribute it to the app.
**Recommendation:** This is solvable inside the existing LLM narrative layer at essentially zero additional engineering cost. The LLM prompt should include show/fireworks blocks and instruct Claude to recommend viewing positions with timing context. Flag as a narrative quality requirement, not a feature gap.

### GAP-4: Pre-Trip Planning Timeline / Checklist
**What users will ask for:** "What do I need to do 60 days out? 30 days? 7 days?" Disney planning has hard time gates (60-day dining reservations, 7-day vs 3-day LL booking, 10-day early check-in, 30-day DAS application window). First-timers miss these constantly.
**Complexity:** LOW — a static timeline driven by trip start date, with push notifications at each milestone ("Your 60-day dining window opens in 3 days"). The timeline content is knowable; it just needs to be surfaced.
**Risk if ignored:** Users who miss the 60-day dining window for Be Our Guest or California Grill will blame the app, even if the app didn't promise to remind them.
**Recommendation:** Build a lightweight planning timeline view with milestone push notifications. Driven by trip start date + on-property flag (affects LL timing). Low engineering cost, very high first-timer trust value. Strong candidate for v1 addition if scope allows; if not, v1.1.

### GAP-5: Transportation / Transit Instructions
**What users will ask for:** "How do I get from our hotel to Animal Kingdom?" On-property guests use Disney transportation (Skyliner, Monorail, bus, boat) which has its own timing patterns. Off-property guests drive or use rideshare. None of this is accounted for in competitor plans, and it affects arrival time accuracy (the solver's "earliest feasible arrival" depends on transportation mode and hotel location).
**Complexity:** MEDIUM — transportation mode is already a trip wizard input. The gap is surfacing per-day transportation instructions in the plan narrative. The LLM can generate this from resort + transportation mode + park assignment.
**Risk if ignored:** A plan that says "arrive at 8:30am" but doesn't explain that the Skyliner stops running 30 minutes after park close leads to stranded guests and bad reviews.
**Recommendation:** Include per-day transportation instructions in the LLM narrative layer (e.g., "Take the Skyliner from Caribbean Beach — allow 20 minutes. Last departure back is 30 minutes after park close."). This is a narrative quality requirement, not a new feature. Flag for LLM prompt engineering.

### GAP-6: Park Ticket Type / Date Selection Guidance
**What users will ask for:** "Which days should I buy Park Hopper for? Do I need date-specific tickets?" Disney's tiered date-specific ticket pricing is complex. Buying the wrong type costs real money. No planning app walks users through this before they commit.
**Complexity:** LOW — a pre-trip guidance screen or tip in the wizard completion screen. Does not require booking integration. The LLM can generate a short "ticket buying guide" based on budget tier and park day schedule.
**Risk if ignored:** Users who bought single-park tickets show up with a plan suggesting park hopping. Immediate 1-star review.
**Recommendation:** Add a "before you buy your tickets" narrative block to the plan output, generated by the LLM from the trip's park assignment and park hopper flag. Zero new engineering; flag for LLM prompt quality.

---

## Sources

- TouringPlans.com feature pages (verified via WebFetch, April 2026)
- Park Autopilot blog — Genie+ vs TouringPlans comparison (verified via WebFetch, April 2026)
- WDW Trip Planner Pro (disneytrip.app) feature pages (verified via WebFetch, April 2026)
- RideMax.com feature pages (verified via WebFetch, April 2026)
- InsideTheMagic: "Disney World's App Dependence Is Reaching a Breaking Point" (Dec 2025)
- DISboards.com: TouringPlans Lines app review threads (2024–2025)
- AllEars.net: Lightning Lane strategy for 2026 + app improvement articles
- Amy Messenger / Medium: "Five Major UX Issues in the My Disney Experience App"
- Reddit r/WaltDisneyWorld community notes (sourced via search aggregation)
- MagicCost Planner, Plan the Magic, Laugh & Gear budget calculators (confirmed existence + demand)
- Undercover Tourist: Sensory break locations, crowd calendar, Rider Switch guide

---

*Feature research for: WonderWaltz — Disney World personalized itinerary planner*
*Researched: 2026-04-09*
