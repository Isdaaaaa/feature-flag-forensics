# Project Design — Feature Flag Forensics

## Personality
- Confident, analytical, and calm — like a trusted incident responder
- Tone: concise, explanatory, and transparent about assumptions

## Visual identity
- Colors: deep navy (#0B1E39) background accents, cyan (#3BC8F6) for highlights, amber (#F5A524) for warnings/conflicts, soft gray (#E5E7EB) for panels
- Typography: Heading — Inter Bold; Body — Inter Regular/Medium
- Iconography: thin outline icons for states (success, warning, info)

## Layout
- Two-panel primary layout: left timeline/trace, right explanations
- Top tabs for "Session Trace" and "Graph"
- Secondary drawer for fixtures selection and session metadata
- Sticky summary bar with user/session ID and flag outcomes

## Components
- Timeline list with event markers and flag decisions
- Explanation cards showing rule conditions, matched attributes, and outcomes
- Graph view (Visx/D3) with nodes for flags and edges for dependencies/rollouts; conflict edges highlighted in amber
- Pill badges for rule states (matched/missed/conflict/stale)
- Export card with CTA for support report

## Inspirations
- Datadog traces/Flamegraphs for sequencing clarity
- LaunchDarkly rule editor for condition layout
- Incident postmortem UIs for concise storytelling

## Accessibility & UX notes
- High-contrast theme with clear focus states
- Provide copy-to-clipboard for explanations
- Use consistent time formatting and explicit time zones
- Show evidence links (attribute/value) for each rule decision
