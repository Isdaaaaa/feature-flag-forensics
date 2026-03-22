# Feature Flag Forensics

Incident-style workspace for understanding **why** a feature flag resolved the way it did for a specific user session.

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS

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

## Slice-000 status

Bootstrap scaffold is in place:

- app shell with top tabs (`Session Trace`, `Graph`)
- sticky summary bar with mock outcomes
- two-panel timeline + explanations layout
- fixtures drawer placeholder + export card placeholder
- intentional loading and empty-state placeholders
