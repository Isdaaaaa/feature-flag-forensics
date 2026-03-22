# Feature Flag Forensics

Incident-style workspace for understanding **why** a feature flag resolved the way it did for a specific user session.

## Product pitch

Feature Flag Forensics helps teams move from "it looks wrong" to a clear, evidence-backed answer in minutes. It combines a time-ordered session trace, rule-level explanations, and dependency graphing so engineers and support teams can explain outcomes confidently.

## Key features

- **Session Trace timeline** with explicit timezone-aware timestamps
- **Decision explanations** for matched/missed rule conditions and final outcome source
- **Evidence links** (attribute/value) that connect events to rule proof
- **Graph view** with rollout sequence, inferred dependencies, and conflict highlighting
- **Sticky summary bar** for fast status checks (events, outcomes, conflicts, stale)
- **Support export flow**
  - Copy report to clipboard
  - Download support-ready `.txt` report
  - Manual copy fallback when clipboard access is blocked

## Architecture overview

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS

### Data + evaluation flow
1. Fixture datasets are ingested into typed models (`lib/fixtures/*`).
2. Session + user + flag config context is assembled.
3. Rule evaluation computes per-flag outcomes and condition traces (`lib/rules/*`).
4. UI renders:
   - Timeline events + evidence chips
   - Explanation cards
   - Graph nodes/edges for rollout and dependencies
   - Exportable support report text

### UX structure
- Two-panel forensic layout (trace + explanation)
- Top tabs (`Session Trace`, `Graph`)
- Left sidebar panel for fixtures metadata + export controls
- Sticky summary context bar for session identifiers and key metrics

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` — local development
- `npm run lint` — lint checks
- `npm run build` — production build
- `npm run format` — write formatting
- `npm run format:check` — verify formatting

## Demo steps

For a guided 5–7 minute walkthrough, see [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

Quick run-through:
1. Open the app and review session context + timezone label.
2. Walk through timeline events in `Session Trace`.
3. Inspect matched/missed conditions in `Decision explanations`.
4. Jump between evidence chips and evidence list items.
5. Switch to `Graph` and call out conflict paths (amber).
6. Use `Copy report` and `Download .txt` in Export card.

## Screenshots

Capture references are documented in [`scripts/capture-screenshots.md`](./scripts/capture-screenshots.md).

Place screenshots here (suggested):

- `docs/screenshots/01-session-trace-overview.png`
- `docs/screenshots/02-timeline-evidence-links.png`
- `docs/screenshots/03-decision-explanations.png`
- `docs/screenshots/04-graph-view-conflicts.png`
- `docs/screenshots/05-export-card-feedback.png`

---

Built as a portfolio slice to showcase explainable product UX for feature flag debugging and incident support workflows.
