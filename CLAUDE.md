# jerryli.design: working rules

## Publishing
- Work on the `redesign` branch, which deploys to a protected Vercel preview.
- Never push to `main` or change jerryli.design until Jerry says "ship it".
- Preview build: `PREVIEW=1 node tools/build.mjs` (drafts shown). Production build leaves drafts out.

## Content
- Copy uses only facts Jerry has stated. Never invent numbers, dates, teams, placements or reasons.
- The Drone on Wheels research is framed as MIT Lincoln Laboratory, never BWSI.
- A project with no media stays `draft: true`.

## CAD
- Use Jerry's real CAD only. Never change shapes and never build stand-in models. Simplifying means dropping screws or PCBs, nothing more.
- Mechanism motion is rigged from real axes in the CAD (see `tools/cad-axes.py`), not guessed.

## Performance
- Pages must stay fast on slow wifi: compress models (meshopt), lazy-load 3D and video, and hash asset URLs.

## Full rebuild standard (set by Jerry, Sept 25, 2026)
When the site is rebuilt from his full media and CAD folder, every project gets all three of:
1. An interactive 3D model from his real CAD, with multiple versions where they exist.
2. Live animation of the project's mechanisms, rigged from the real CAD.
3. An extremely in-depth technical write-up of the engineering decisions, built from the build-process media.

Jerry will supply a per-project minimum list of engineering decisions to cover; every item on it must be covered. If a project has no CAD, tell Jerry rather than modelling it.
