---
phase: 0
slug: name-lock
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 0 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual shell checklist (no automated test framework — documentation phase) |
| **Config file** | none |
| **Quick run command** | `test -f docs/legal/trademark-search-2026.md && echo PASS \|\| echo FAIL` |
| **Full suite command** | See Per-Task Verification Map below (four shell checks) |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command — `test -f docs/legal/trademark-search-2026.md && echo PASS || echo FAIL`
- **After every plan wave:** Run all four checks in the Per-Task Verification Map
- **Before `/gsd:verify-work`:** All four checks must return PASS
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 0-01-01 | 01 | 1 | LEGL-01 | smoke — file exists | `test -f docs/legal/trademark-search-2026.md` | ❌ W0 | ⬜ pending |
| 0-01-02 | 01 | 1 | LEGL-01 | content — all nine memo elements present | `for s in "Jurisdiction Coverage" "Google Search Results" "App Store Search Results" "Play Store Search Results" "Founder Assertion" "Known Risks Accepted" "Reactive Escalation Policy" "Decision Record" "Date:"; do grep -q "$s" docs/legal/trademark-search-2026.md \|\| { echo "MISSING: $s"; exit 1; }; done && echo PASS` | ❌ W0 | ⬜ pending |
| 0-01-03 | 01 | 1 | LEGL-01 | content — founder signature line present | `grep -i "^\*\*Signed:\*\*" docs/legal/trademark-search-2026.md` | ❌ W0 | ⬜ pending |
| 0-01-04 | 01 | 1 | LEGL-01 | git — memo is committed to history | `git log --oneline -- docs/legal/trademark-search-2026.md \| head -1 \| grep -q .` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `docs/legal/` — directory must be created before memo can be written
- [ ] `docs/legal/trademark-search-2026.md` — the memo file itself (primary Phase 0 deliverable)

*No test framework install needed — all checks are shell one-liners against file existence, content, and git history.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Founder actually ran the Google + App Store + Play Store searches | LEGL-01 | The memo's assertion is founder-provided; no automated way to verify the human did the work honestly | Read the memo's Google / App Store / Play Store sections. Confirm result counts and notable-hits lists are non-placeholder (e.g., not literal `[N]` or `[list]` strings). Per `gsd-verifier` conversational UAT. |
| Founder signed the Decision Record | LEGL-01 | Signature is a human act, not an automated check beyond existence of the line | Read the memo's Decision Record section. Confirm `**Signed:**` line has a real name (not a placeholder `[Founder Name]`). |
| Founder accepts the Disney C&D risk knowingly | LEGL-01 | Intent and informed consent are human concerns | Read the "Known Risks Accepted" section. Confirm it names Character.AI (Sept 2025) and ByteDance (Feb 2026) explicitly or equivalently. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (only 4 tasks, all automated)
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter (flips to true once Wave 0 writes the memo and all four checks go green)

**Approval:** pending — flips to `approved YYYY-MM-DD` once the planner confirms the plan's tasks map 1:1 to this verification map
