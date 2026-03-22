# Feature Flag Forensics — Plan

## Summary
A debugging and explanation tool that replays how feature flags affected a user session, showing rule evaluations, conflicts, and why the user saw a specific product state.

## Target user
- Product engineers and platform teams operating feature flags
- Support and SRE teams triaging unexpected user experiences

## Portfolio positioning
Highlights systems thinking, observability for feature flag rollouts, and clear UX for explaining complex rule interactions. Shows ability to turn backend logic into a visual, support-ready tool.

## MVP scope
- Upload/import flag config, sample user attributes, and session event logs from fixtures
- Deterministic rules evaluation with a trace of which rules fired and why
- Explanation pane with plain-language why/why-not summaries for a specific user session
- Timeline of flag decisions with key events
- Visual graph of flag dependencies, conflicts, and rollout splits

## Non-goals (MVP)
- Live SDK integration or streaming ingest
- Multi-tenant auth and RBAC
- Full A/B experiment analysis
- Real-time collaboration

## Technical approach
- Next.js (app router) with TypeScript and Tailwind for a fast UI scaffold
- Server-side modules to parse JSON configs and evaluate rules deterministically
- Structured trace objects (per rule evaluation) feeding the UI and explanations
- Visx/D3 for graphs; timeline component for ordered events
- Sample fixtures stored locally; potential AI copy layer kept optional and stubbed

## Execution notes
- Keep fixtures small and realistic (stale flags, targeting edge cases)
- Ensure traces are deterministic and debuggable before UI polish
- Favor explainability: every decision should cite input attributes and rule conditions
- Seed the repo with a polished demo workspace and screenshots for recruiters
