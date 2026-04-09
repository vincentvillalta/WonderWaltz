# Phase 0: Name Lock — Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 0 delivers a **trademark clearance memo** for the name "WonderWaltz" that records the founder's assertion of clearance and a light self-check artifact. This memo unblocks all downstream phases from acting on the name.

**In scope:**
- A Google search on "WonderWaltz" + close variants
- An App Store and Play Store search for existing apps using "WonderWaltz" or close variants
- A short clearance memo committed to `docs/legal/trademark-search-2026.md`
- Explicitly recording the founder's decision to skip formal trademark databases (USPTO, EUIPO) and not to engage an attorney for clearance

**Out of scope (explicitly):**
- Formal USPTO TESS search
- Formal EUIPO eSearch
- Attorney-run clearance search
- Preparing alternate names as a fallback
- Domain registration (happens in Phase 8)
- Social handle claiming (happens in Phase 8)
- Any other legal review (disclaimers, privacy, ToS — all in Phase 8 under LEGL-05)

Phase 0 blocks only public name commitments until the light check + memo are complete. Internal monorepo scaffolding (Phase 1) can begin immediately after this memo lands.

</domain>

<decisions>
## Implementation Decisions

### Trademark search posture

- **Founder asserts the name "WonderWaltz" is clear** based on informal prior research. This assertion is the foundation of Phase 0 and is treated as a locked decision.
- **No formal trademark database search** (USPTO TESS, EUIPO eSearch, WIPO, UK IPO) will be run — now or later. The founder explicitly opted out.
- **No attorney clearance engagement** at any phase. The Phase 8 IP lawyer engagement (LEGL-05) is scoped to disclaimers, privacy policy, ToS, and store listing review — **not** trademark clearance.
- **Attorney escalation trigger: reactive only.** Engage an attorney only if Disney or another rights holder issues a cease-and-desist, DMCA, or formal legal notice after launch. No proactive legal escalation.

### Self-check scope (the "light check")

- **Google search** on `"WonderWaltz"`, `"Wonder Waltz"`, and obvious close variants. Goal: catch unregistered commercial use (company names, existing products, active blogs, YouTube channels).
- **App Store search** (iOS + Mac) for any app using "WonderWaltz" or a close variant in its name or keywords.
- **Google Play Store search** for any app using "WonderWaltz" or a close variant.
- Screenshots or copy-pasted search result headers recorded in the memo as informal evidence. No legal rigor claimed.
- **Time budget**: ~30 minutes of founder self-work.

### Alternate name list

- **No alternate names prepared.** Full commitment to "WonderWaltz."
- If the light check surfaces a blocking collision during Phase 0 execution, Phase 0 escalates to the founder for a name pivot decision at that time. We are NOT pre-committing to any backup name.
- The `ui-designer` brand kickoff in Phase 1 will NOT explore alternate names — only the three brand direction explorations (vintage travel poster / warm modern minimalism / painterly whimsy) for "WonderWaltz."

### Clearance memo format

- **File location**: `docs/legal/trademark-search-2026.md` — committed to the public repo (matches roadmap success criteria)
- **Contents**:
  1. Date + founder name + method (self-check, not attorney)
  2. Jurisdiction coverage: what was searched and what was NOT searched
  3. Google search: queries run, approximate result count, notable hits (if any)
  4. App Store search: result count, any apps using the name or close variants
  5. Play Store search: same
  6. Founder assertion: explicit statement that "WonderWaltz" is considered clear for use based on this light check + prior informal research
  7. Known risks: explicit acknowledgment of the Disney C&D pattern (Character.AI 2025, ByteDance 2026) and the decision to accept that risk
  8. Reactive escalation policy: "Engage trademark attorney only on receipt of a formal legal notice from a rights holder"
  9. Decision record: founder signed + dated (plain text is sufficient)

### Phase 0 blocking behavior

- Phase 0 blocks: use of the WonderWaltz name in any public commitment (domain purchase, social handle claim, public GitHub repo description, App Store listing, marketing copy).
- Phase 0 does NOT block: internal monorepo scaffolding (Phase 1 foundations), internal design kickoff, private development. The repo remains private and internal until the memo lands.

### Claude's Discretion

- Exact memo wording (as long as the nine required elements above are present)
- Whether to present search result screenshots inline or as links
- Whether to wrap the memo in a GitHub-flavored markdown template

</decisions>

<specifics>
## Specific Ideas

- The memo should be **honest about the decision trade-off**, not dressed up as due diligence. A future reader (founder, investor, attorney, auditor) should be able to see clearly that a formal search was deliberately skipped and why.
- **The Disney C&D risk is real and documented.** Research cited Character.AI (Sept 2025) and ByteDance (Feb 2026) both receiving C&Ds within months of launching products that touched Disney IP. The memo must acknowledge this context so the decision is defensible as "informed risk acceptance" rather than "oversight."
- Tone: factual, brief, not defensive. One page is plenty.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- None. Repo is empty except for `.planning/` and `.claude/agents/`. Phase 0 is a documentation-only phase; no code.

### Established Patterns

- All `.planning/` docs are committed via `node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit` with a conventional commit message. The clearance memo will follow the same pattern: `docs(00): add trademark clearance memo`.
- Documentation lives at two levels:
  - `.planning/phases/XX-name/` — GSD workflow artifacts (CONTEXT.md, PLAN.md, RESEARCH.md, etc.)
  - `docs/` — project documentation consumed by humans and downstream agents (legal, design, architecture). The clearance memo belongs in `docs/legal/` per roadmap success criteria, not in `.planning/`.

### Integration Points

- Phase 8 (Website & Legal) needs to read `docs/legal/trademark-search-2026.md` to confirm the name is committed before privacy policy, ToS, and store listing metadata are written. The memo is the upstream artifact for several downstream LEGL requirements.
- Phase 10 (Beta & Launch) success criteria LNCH-06 ("IP lawyer written sign-off") must be interpreted in light of this CONTEXT.md: the Phase 8 lawyer is not running clearance, and the reactive-only policy means LNCH-06's scope is disclaimers/privacy/ToS/listings only, not trademark clearance.

</code_context>

<deferred>
## Deferred Ideas

### Formal trademark search (if ever)

If the founder later changes posture and wants a formal clearance search, the scope to add would be:
- USPTO TESS search in Classes 9, 41, 42 (software, entertainment services, SaaS)
- EUIPO eSearch in the same classes
- Phonetic similarity review (WonderWaltz ~ WanderWaltz ~ WonderWaltzy ~ WonderWatts etc.)
- Design mark review after `ui-designer` produces the brand (separate Phase 1 follow-up)
- Attorney engagement (~$500-2000) for formal legal opinion

This is **not scheduled**. It is captured here so that if the founder wants to add it later, the scope is already known and can become a new phase (e.g., Phase 0.5) without re-discovery.

### Alternate names exploration

If "WonderWaltz" ever needs to be retired (post-launch C&D, trademark dispute, branding pivot), we will need alternate names. This is not Phase 0's job. If it ever happens, it becomes a separate phase with its own `ui-designer` engagement.

### WIPO / UK IPO / multi-jurisdiction

Disneyland Paris launches in v1.1. At that time the name's EU and UK status matters more. If the founder wants to add an EU/UK trademark review at v1.1, it should be scheduled as part of the v1.1 milestone roadmap — not now.

</deferred>

---

*Phase: 00-name-lock*
*Context gathered: 2026-04-09*
