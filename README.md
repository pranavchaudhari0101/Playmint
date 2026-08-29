# Playmint — Hiring Assignment Package

## What is included

- `docs/Playmint_PRD_Case_Study.docx` — professional 10-page PRD/case study.
- `docs/Prototype_Spec_and_Figma_Structure.md` — screen-by-screen specification, Figma page structure, React architecture, seed data and demo flow.
- `react/` — Vite/React prototype source.

## Submission framing

The hiring manager's explicit deliverables are:
1. Working prototype/shareable link.
2. Short note explaining key product decisions and assumptions.
3. AI/vibe-coding tools used.

The package therefore treats the working prototype + short case study as the core submission. The deep PRD, economy, technical and compliance material is supporting evidence rather than the main story.

## Suggested tool disclosure

- ChatGPT — product discovery, PRD drafting, UX/system thinking, code scaffolding.
- React + Vite — prototype implementation.
- Figma — recommended for final visual polish / presentation if desired.

## Local run

```bash
cd react
npm install
npm run dev
```

The current environment does not have network package installation available, so the prototype source is provided without `node_modules`. It is intentionally dependency-light.
