# Demo Script (5–7 minutes)

## Audience
Recruiters, hiring managers, and engineering leads evaluating product thinking, frontend execution, and debugging UX design.

## Goal
Show how **Feature Flag Forensics** helps teams explain *why* a flag resolved ON/OFF for one session, quickly and with evidence.

---

## Talk Track + In-App Actions

### 0:00–0:45 — Product Pitch
**Say:**
"Feature Flag Forensics is an incident-style workspace for debugging feature flag decisions at the session level. Instead of guessing why rollout behavior differed for a user, we can replay the trace, inspect rule matches, and export a support-ready report."

**Action:**
- Open the app homepage.
- Point to the title "Session-level decision trace" and the timezone label.

**Highlight:**
- Calm, analytical incident-response UI tone.
- High-contrast layout for operational use.

---

### 0:45–2:00 — Session Trace Flow
**Say:**
"On the `Session Trace` tab, events are ordered and timestamped with explicit timezone handling. I can see what happened in sequence, including evaluation and outcome events."

**Action:**
- Stay on **Session Trace** tab.
- Scroll timeline cards in "Timeline trace".
- Click one evidence chip in a timeline item to jump to evidence details.

**Highlight:**
- Timeline mirrors incident investigation workflow.
- Evidence chips create traceability from event → attribute proof.

---

### 2:00–3:15 — Decision Explanations
**Say:**
"The right panel translates rule evaluation into plain language: matched conditions, missed conditions, and the final evaluated outcome with source."

**Action:**
- In "Decision explanations", point to:
  - Matched rule conditions
  - Missed rule conditions
  - Final evaluated outcome
- Scroll to "Evidence links (attribute/value)".

**Highlight:**
- Recruiter-facing: this demonstrates UX for explainability, not just raw data rendering.
- Engineering-facing: conditions preserve operator/expected/actual context.

---

### 3:15–4:15 — Graph View + Conflict Signaling
**Say:**
"The `Graph` tab gives a rollout/dependency map. Solid edges indicate rollout path, dashed edges indicate inferred dependencies, and amber emphasizes conflict paths."

**Action:**
- Click **Graph** tab.
- Point to at least one node and one amber edge.
- Point to legend badges below graph.

**Highlight:**
- Visual grammar supports fast triage.
- Conflict states are intentionally color-coded per design system.

---

### 4:15–5:30 — Support Handoff
**Say:**
"Once I understand the incident, I can hand it off in seconds. The export card supports copy-to-clipboard and direct text download for ticketing or customer support workflows."

**Action:**
- In left sidebar, click **Copy report**.
- Click **Download .txt**.
- Optionally show success message and manual-copy fallback area (if clipboard permissions are blocked).

**Highlight:**
- Practical product depth: includes operational handoff, not only analysis UI.

---

### 5:30–6:30 — Technical Wrap-Up
**Say:**
"Under the hood, fixtures are ingested into typed models, then rule evaluation builds timeline and explanation artifacts in a deterministic way. The app keeps a two-panel incident layout and sticky summary bar so context is always visible while drilling into details."

**Action:**
- Return to **Session Trace**.
- Point to sticky summary badges (session, events, flags, outcomes, conflicts/stale).

**Highlight:**
- Architecture supports extension to live ingestion APIs later.
- Current version is ideal for deterministic demos and portfolio review.

---

## Recruiter-Facing Highlights (Quick List)

- Clear **problem framing**: "why did this flag resolve this way?"
- Strong **information architecture**: timeline + explanations + graph + export.
- Intentional **design system**: navy/cyan/amber palette, consistent badges/cards.
- Practical **DX/UX balance**: typed evaluation pipeline plus human-readable narratives.
- Evidence-driven troubleshooting flow with copy/download handoff support.

## Suggested Closing Line
"This project shows how I design and ship debugging tools that are both technically grounded and operationally useful for real support and incident workflows."