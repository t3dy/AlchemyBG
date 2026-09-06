# DEPLOY_STATE — The Alchemist's Lab

## Canonical production URL

**https://t3dy.github.io/AlchemyBG/**

## Host

GitHub Pages, served from `t3dy/AlchemyBG` via `.github/workflows/deploy.yml`
(Actions → Pages artifact, not a `gh-pages` branch). Every push to `main` runs
`npm ci`, `npm test`, then `npm run build` and publishes `out/`.

## Migrated off Vercel — 2026-09-06

`alchemy-board-game.vercel.app` is **gone**. The Vercel project was deleted to
cut deployment storage.

The one serverless route, `GET /api/daily`, was removed in the move. It never
read server state — the daily seed is a pure function of the UTC date — so the
same logic now lives in `src/lib/daily.ts` and runs in the browser. Every
player on a given day still gets the same seed, so the daily challenge is
unchanged. `.vercel/` is inert.

## Gotchas

- **Base path.** Pages serves this under `/AlchemyBG`, so `next.config.ts` sets
  `basePath` and `assetPrefix` only when `GITHUB_PAGES=true`. Building without
  that env var and uploading the result 404s every asset.
- **`output: "export"` means no server.** No API routes, no middleware, no
  `dynamic = "force-dynamic"`, no server actions, no Next image optimizer
  (hence `images.unoptimized`). Adding any of those breaks the build.
- **Stale `.next` type cache.** After deleting a route, `next build` can still
  fail type-checking against a generated validator that imports it. `rm -rf
  .next` and rebuild.
- `trailingSlash: true` so `/route` resolves to `/route/index.html`, which is
  all Pages can serve.
