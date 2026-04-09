# Phase 0: Name Lock — Research

**Researched:** 2026-04-09
**Domain:** Documentation — informal trademark clearance memo
**Confidence:** HIGH (phase is purely procedural; no library APIs or ambiguous tooling involved)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Founder asserts "WonderWaltz" is clear based on informal prior research. This is the foundation of Phase 0.
- No formal trademark database search (USPTO TESS, EUIPO eSearch, WIPO, UK IPO) — now or later. Founder explicitly opted out.
- No attorney clearance engagement at any phase. Phase 8 IP lawyer (LEGL-05) covers disclaimers, privacy, ToS, store listings — NOT trademark clearance.
- Attorney escalation is reactive only: engage only on receipt of a C&D, DMCA, or formal legal notice from a rights holder after launch.
- Self-check scope: Google search on "WonderWaltz" / "Wonder Waltz" / close variants; App Store (iOS + Mac) search; Google Play Store search. Screenshots or copy-pasted headers as informal evidence. ~30-minute time budget.
- No alternate names prepared. Full commitment to "WonderWaltz."
- If the light check surfaces a blocking collision during execution, Phase 0 escalates to the founder for a name pivot decision at that time.
- File location: `docs/legal/trademark-search-2026.md` — committed to the public repo.

### Claude's Discretion
- Exact memo wording (as long as the nine required elements are present)
- Whether to present search result screenshots inline or as links
- Whether to wrap the memo in a GitHub-flavored markdown template

### Deferred Ideas (OUT OF SCOPE)
- USPTO TESS search (Classes 9, 41, 42), EUIPO eSearch, phonetic similarity review, design mark review, attorney engagement (~$500-2000)
- Alternate names exploration
- WIPO / UK IPO / multi-jurisdiction (EU/UK review deferred to v1.1 Disneyland Paris milestone)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEGL-01 | Trademark clearance search on "WonderWaltz" returns clear before any public commitment (domain, social, public repo, App Store listing) | Note: REQUIREMENTS.md states USPTO TESS + EUIPO eSearch, but CONTEXT.md (locked decision) supersedes this with the founder's informal self-check posture. The deliverable that satisfies LEGL-01 in practice is the completed clearance memo at `docs/legal/trademark-search-2026.md` recording the founder's assertion plus the light self-check results. |
</phase_requirements>

---

## Summary

Phase 0 delivers exactly one artifact: a one-page markdown memo at `docs/legal/trademark-search-2026.md`. The memo records the founder's informed assertion that "WonderWaltz" is clear for use, the scope of the light self-check performed, and explicit acknowledgment of the risks deliberately accepted (including the Disney C&D pattern). No code is written; no attorneys are engaged; no formal trademark databases are queried.

The execution work has two parts: (1) the founder runs a ~30-minute Google + App Store + Play Store search and records the results, then (2) the memo is drafted with all nine required elements and committed to the repo. The memo's value is not legal protection — it is an honest audit trail that a future investor, attorney, or the founder themselves can read and understand exactly what was checked, what was skipped, and why.

**Primary recommendation:** Write the memo to be read by a skeptical future attorney, not to impress anyone today. Directness ("formal trademark database search was deliberately skipped") is more defensible than hedging.

---

## Light Self-Check Procedure

Total time budget: ~30 minutes. Record all results in the memo (copy-paste result counts and any notable hits; screenshots optional but useful).

### Step 1 — Google Search (10 min)

Run each query in an incognito window to avoid personalization bias:

1. `"WonderWaltz"` — exact match, all results
2. `"Wonder Waltz"` — spaced variant
3. `WonderWaltz app` — app-context search
4. `WonderWaltz Disney` — collision check with Disney-adjacent context
5. `WonderWaltz trademark` — any existing trademark notices or disputes

For each query: note approximate result count and list any notable hits (existing products, companies, YouTube channels, websites using the name commercially). A "notable hit" is any result where another entity is using "WonderWaltz" (or "Wonder Waltz") as a brand identifier for a product or service.

No special tools needed. Plain browser in incognito is sufficient.

### Step 2 — App Store Search (10 min)

On an iOS device or via the macOS App Store (or https://apps.apple.com search):

1. Search `WonderWaltz` — exact
2. Search `Wonder Waltz` — spaced
3. Search `WonderWaltz Disney` — collision check

Record: number of results returned, names of any apps that use "WonderWaltz" or "Wonder Waltz" in their title, subtitle, or (if visible) description. If zero results, state that explicitly.

### Step 3 — Google Play Store Search (10 min)

Via https://play.google.com/store/search or on an Android device:

1. Search `WonderWaltz`
2. Search `Wonder Waltz`

Record: same as App Store — result counts, any apps using the name or close variants.

### What constitutes a blocking collision?

A blocking collision requiring escalation to the founder is: any existing product (app, website, company) using "WonderWaltz" or "Wonder Waltz" as a primary brand identifier in a consumer-facing context, particularly in travel planning, entertainment, or family apps. A single blog post, a defunct app, or an unrelated industry usage is not blocking — record it and note it as non-blocking.

---

## Memo Template

The nine required elements from CONTEXT.md are embedded as fill-in sections. Plain GitHub-flavored markdown. One page.

```markdown
# Trademark Self-Check Memo: WonderWaltz

**Date:** [YYYY-MM-DD]
**Prepared by:** [Founder name]
**Method:** Self-check (informal). No attorney engaged. No formal trademark database searched.

---

## 1. Jurisdiction Coverage

**Searched (informal):**
- Google web search (global index)
- Apple App Store (iOS + Mac)
- Google Play Store

**Explicitly NOT searched:**
- USPTO TESS (US trademark database)
- EUIPO eSearch (EU trademark database)
- WIPO Global Brand Database
- UK IPO trademark register
- Any other national trademark registry

The decision to skip formal trademark databases was made by the founder and is recorded here as a deliberate, informed choice — not an oversight.

---

## 2. Google Search Results

**Queries run:** `"WonderWaltz"`, `"Wonder Waltz"`, `WonderWaltz app`, `WonderWaltz Disney`, `WonderWaltz trademark`

**Results:**
- `"WonderWaltz"`: approximately [N] results. Notable hits: [list or "none identified"]
- `"Wonder Waltz"`: approximately [N] results. Notable hits: [list or "none identified"]
- `WonderWaltz app`: [summary]
- `WonderWaltz Disney`: [summary]
- `WonderWaltz trademark`: [summary]

**Assessment:** [No existing commercial use of "WonderWaltz" or "Wonder Waltz" identified that would represent a blocking collision. / OR: The following potentially conflicting use was identified: ...]

---

## 3. App Store Search Results

**Platform:** Apple App Store (iOS + Mac)
**Queries:** `WonderWaltz`, `Wonder Waltz`

**Results:** [N] apps returned. [None use "WonderWaltz" or "Wonder Waltz" in their name or subtitle. / OR: The following app was identified: ...]

---

## 4. Google Play Store Search Results

**Platform:** Google Play Store
**Queries:** `WonderWaltz`, `Wonder Waltz`

**Results:** [N] apps returned. [None use "WonderWaltz" or "Wonder Waltz" in their name. / OR: The following app was identified: ...]

---

## 5. Founder Assertion

Based on this light self-check and prior informal research, I assert that "WonderWaltz" is clear for use as the product name for a Walt Disney World trip-planning app. No blocking commercial use of the name was identified in the searches conducted above.

This assertion is not a legal opinion and does not constitute a formal trademark clearance. It is an informed business judgment made in the context of a self-funded product at pre-launch stage.

---

## 6. Known Risks Accepted

The following risks are acknowledged and explicitly accepted:

**Disney C&D pattern:** The Walt Disney Company aggressively enforces its trademark and copyright portfolio. In September 2025, Disney sent a cease-and-desist to Character.AI requiring removal of all Disney characters from their platform. In February 2026, Disney sent a C&D to ByteDance/Seedance over AI-generated content using copyrighted characters. Both actions required immediate compliance. While WonderWaltz does not use Disney imagery, characters, or logos, any fan-adjacent app touching Disney's ecosystem carries the risk of a C&D — even one without merit — that requires legal response and potential platform delisting.

**No formal database clearance:** USPTO, EUIPO, and other trademark registries were not searched. An identical or phonetically similar mark may exist in a relevant class (Class 9 — software; Class 41 — entertainment services) that was not identified by this self-check. A formal search (~$500–2000 with an attorney) would reduce this risk but was deliberately skipped at this stage.

**Public repo exposure:** This memo is committed to a public git repository. Its contents, including this risk acceptance, are world-readable. This is intentional — the memo is designed to serve as an honest audit trail.

---

## 7. Reactive Escalation Policy

Engage a trademark attorney only upon receipt of a formal legal notice from a rights holder: a cease-and-desist letter, DMCA takedown, or App Store / Play Store removal notice citing trademark or IP infringement. No proactive legal escalation is planned before launch.

The Phase 8 IP lawyer engagement (LEGL-05) is scoped to: disclaimers, privacy policy, Terms of Service, and app store listing review. It does not include trademark clearance.

---

## 8. Decision Record

I, [Founder Name], have reviewed the above search results and risk acknowledgment. I accept the risks described above and authorize use of the name "WonderWaltz" for the product.

**Signed:** [Founder Name]
**Date:** [YYYY-MM-DD]
```

---

## Validation Architecture

> nyquist_validation is enabled per `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual checklist (no automated test framework — documentation phase) |
| Config file | none |
| Quick run command | `test -f docs/legal/trademark-search-2026.md && echo PASS || echo FAIL` |
| Full suite command | See checklist below |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEGL-01 | Clearance memo exists at correct path | smoke | `test -f docs/legal/trademark-search-2026.md` | Wave 0 |
| LEGL-01 | Memo contains all nine required elements | content | `grep -c "Founder Assertion\|Known Risks\|Reactive Escalation\|Decision Record\|Jurisdiction Coverage\|Google Search\|App Store\|Play Store\|Date.*Prepared by" docs/legal/trademark-search-2026.md` (expect 9 matches) | Wave 0 |
| LEGL-01 | Memo contains founder signature line | content | `grep -i "Signed:" docs/legal/trademark-search-2026.md` | Wave 0 |
| LEGL-01 | Memo is committed to git history | git | `git log --oneline -- docs/legal/trademark-search-2026.md \| head -1` (expect non-empty) | Wave 0 |

### Sampling Rate

- **Per task commit:** `test -f docs/legal/trademark-search-2026.md && echo PASS || echo FAIL`
- **Per wave merge:** Full four-check suite above
- **Phase gate:** All four checks green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `docs/legal/trademark-search-2026.md` — the memo itself (primary deliverable, does not exist yet)
- [ ] `docs/legal/` directory — must be created

*(No test framework install needed — all checks are shell one-liners against file existence and content.)*

---

## Gotchas

### Public repo: the memo is world-readable

`docs/legal/trademark-search-2026.md` is committed to a public repo. Everything in it — including the risk acceptance of the Disney C&D pattern, the explicit statement that no formal search was run, and the founder's name — is permanently world-readable and in git history. This is **intentional and fine** for this use case. The memo is designed to be read by a future attorney, investor, or auditor; transparency is the point. No redaction is needed.

One implication: do not include any personal contact information (home address, personal phone number) in the memo beyond the founder's name. A name is appropriate; contact details are not necessary and should stay private.

### Git history is immutable

Once committed, the memo and its contents are in git history permanently (even if the file is later modified). This is fine — the memo should not need to change. If the light check turns up a collision and the founder pivots to a new name, create a new memo for the new name; do not rewrite history.

### The memo does not satisfy LEGL-01 as originally written

REQUIREMENTS.md states LEGL-01 as "USPTO TESS + EUIPO eSearch returns clear." CONTEXT.md (the locked decision) explicitly overrides this with the founder's informal self-check posture. The planner should treat CONTEXT.md as authoritative for Phase 0 scope. The Phase 8 IP lawyer engagement (LEGL-05) is the appropriate moment for a lawyer to review the whole picture — if they recommend a formal search at that point, a Phase 0.5 can be inserted. For now the memo satisfies LEGL-01 by recording the founder's assertion and the self-check results.

### Tone matters for future defensibility

If the memo sounds defensive or legalistic ("we believe in good faith..."), it reads as someone who was nervous — which makes a future C&D recipient look less credible when they say the risk was knowingly accepted. Write it flatly and factually: "Formal trademark databases were not searched. This was a deliberate business decision." That tone is more defensible as informed risk acceptance than hedged language.

### Do not conflate Phase 0 with Phase 8 LEGL-05

Phase 0 is about clearing the name before any public commitment. Phase 8 is about engaging an IP lawyer before App Store submission. These are separate concerns. The Phase 0 memo explicitly documents that the Phase 8 lawyer is not running trademark clearance — this keeps the scope boundaries clean for both phases.

---

## Open Questions

None. The phase scope is fully locked by CONTEXT.md. The only execution variable is the actual search results, which the founder will fill in during self-check execution.

---

## Sources

### Primary (HIGH confidence)
- CONTEXT.md (`00-CONTEXT.md`) — all locked decisions, nine required memo elements, phase boundary
- REQUIREMENTS.md — LEGL-01 original wording and traceability
- PITFALLS.md — Disney C&D pattern (Character.AI Sept 2025, ByteDance Feb 2026), confirmed real-world examples

### Secondary (MEDIUM confidence)
- ROADMAP.md — Phase 0 success criteria and blocking behavior confirmed

---

## Metadata

**Confidence breakdown:**
- Memo structure: HIGH — nine elements are explicitly enumerated in CONTEXT.md; no ambiguity
- Self-check procedure: HIGH — founder specified exactly which three surfaces to check; procedure is straightforward
- Gotchas: HIGH — public repo visibility and git immutability are objective facts; LEGL-01 tension confirmed by reading both files

**Research date:** 2026-04-09
**Valid until:** Indefinite — this phase is documentation-only with fully locked decisions; no technology or ecosystem changes affect it
