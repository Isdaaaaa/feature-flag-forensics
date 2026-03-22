# Manual Screenshot Capture Guide

Purpose: capture consistent portfolio screenshots for Feature Flag Forensics with no external tooling.

## Before you capture

1. Start app:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` in a desktop browser.
3. Use a desktop viewport around **1440×900** (or similar 16:10/16:9).
4. Keep browser zoom at **100%**.
5. Prefer dark mode/system default unchanged for visual consistency.

## Naming + destination

Save all images under:

- `docs/screenshots/01-session-trace-overview.png`
- `docs/screenshots/02-timeline-evidence-links.png`
- `docs/screenshots/03-decision-explanations.png`
- `docs/screenshots/04-graph-view-conflicts.png`
- `docs/screenshots/05-export-card-feedback.png`

Create folder if missing:
```bash
mkdir -p docs/screenshots
```

## Shot list (exact views)

### 01 — Session trace overview
- Tab: **Session Trace**
- Include in frame:
  - Header/title area
  - Sticky summary bar
  - Left fixtures card
  - Top of timeline + explanation panels
- Goal: communicate full page information architecture.

### 02 — Timeline evidence links
- Tab: **Session Trace**
- Scroll to a timeline card that has evidence chips.
- Include at least one visible clickable evidence chip.
- Goal: show event-to-evidence navigation affordance.

### 03 — Decision explanations
- Tab: **Session Trace**
- Frame "Decision explanations" and "Evidence links (attribute/value)" sections.
- Ensure matched/missed states are visible.
- Goal: show explainability depth and condition-level reasoning.

### 04 — Graph view conflicts
- Switch tab to **Graph**.
- Capture graph with:
  - At least one amber/conflict edge or node
  - Legend badges below graph
- Goal: show dependency + rollout visualization and conflict signaling.

### 05 — Export card feedback
- Left sidebar **Export** card in view.
- Click **Copy report** and/or **Download .txt** first.
- Capture with success or warning feedback banner visible.
- Goal: show support handoff UX, not just analysis UI.

## Quality checklist

- Text is legible at README display size.
- No browser bookmarks/personal tabs visible (crop if needed).
- No OS notifications or sensitive data in frame.
- Colors look like intended palette (navy/cyan/amber).
- Filenames match README references exactly.

## Optional post-capture optimization

If needed, compress images manually using your OS image editor while preserving readability.
