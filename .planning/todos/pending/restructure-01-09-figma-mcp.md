---
id: restructure-01-09-figma-mcp
created: 2026-04-14
area: phase-01
priority: high
---

# Restructure Plan 01-09 for Figma MCP workflow

**Context:** Plan 01-09 originally called the ui-designer agent to produce three brand
directions and have the founder pick one. Decision made 2026-04-14: brand direction
and UI/token values will come from **Figma via MCP**, not from a GSD agent.

**What's done:**
- Task 1 of 01-09 is already committed (`54098de`) — three ui-designer directions
  are written to `docs/design/BRAND.md`. These are now disposable reference material.
- Task 2 (checkpoint: pick direction) was reached and aborted.
- Tasks 3+ (write tokens.json from locked palette, rebuild outputs, create
  COMPONENTS/ACCESSIBILITY/ICONOGRAPHY docs) were not started.

**What needs to happen:**
1. Connect Figma MCP server (add to `.mcp.json`)
2. Decide: is `docs/design/BRAND.md` the source of truth, or does it point to Figma?
3. Rewrite `.planning/phases/01-foundation/01-09-PLAN.md`:
   - Remove the ui-designer exploration task
   - New Task 1: pull brand tokens from Figma via MCP, write to `tokens.json`
   - New Task 2: regenerate Style Dictionary outputs (`pnpm --filter @wonderwaltz/design-tokens build`)
   - New Task 3: write `BRAND.md` as a pointer to the Figma file + locked selections,
     plus COMPONENTS/ACCESSIBILITY/ICONOGRAPHY (these can still be docs)
4. Re-execute 01-09 with the new plan

**Blocker:** Figma MCP not yet connected. Once connected, this todo can be picked up.

**Must-haves to preserve from original plan:**
- DSGN-01, DSGN-02, DSGN-05, DSGN-06, DSGN-08 requirement coverage
- tokens.json drives all four platform outputs (Swift/Kotlin/CSS/TS)
- Accessibility doc includes WCAG 2.2 AA contrast requirements
