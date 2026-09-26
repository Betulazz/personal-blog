# 01: Match reference fireflies

Type: prototype
Status: resolved

## Question

Which particle treatment reproduces the supplied site's visible motion and glow?

## Answer

Variant C (reference wandering fireflies) matches the supplied source and saved screenshot. The prior field's small pale dots and near-static movement made the effect hard to see. The bright static variant provided visibility but lacked the reference's independent breathing and four long flight paths.

The production implementation lives in `frontend/app/components/visual/FireflyLayer.vue` and `frontend/app/utils/fireflies.ts`. Desktop shows 50 green fireflies; mobile and reduced motion omit them. The canvas still pauses when the page is hidden.

## Evidence

- `../before-1920x1080-later.png`, `../final-1920x1080-first.png`, and `../final-1920x1080-later.png` show the desktop change and movement.
- `../final-430x932-later.png` shows the mobile presentation.
- `../verification.json` records animation, pause/resume, reduced motion, mobile, navigation, and browser error checks.
- `npm run typecheck`, targeted ESLint/Prettier, the three firefly unit checks, and `npm run build` passed. The local Nuxt and FastAPI processes both served HTTP 200 during comparison.
- Prototype source branch: `codex/particle-prototype` at `a6c32c0` (`.scratch/particle-fidelity/prototype.html`).
