# PocketBrain v0.2.0

PocketBrain is a phone-first Progressive Web App (PWA) starter template for running a small local language model in the browser with private, local memory.

## What’s new in v0.2.0

- Streaming chat output (assistant tokens appear live)
- WebLLM worker runtime for smoother mobile UI responsiveness
- Model loading progress text + progress bar
- Smarter retrieval (“small model, big brain”): BM25-style lexical ranking + recency + strict context budget
- Upgraded settings: curated phone-safe models, worker/cache toggles, device diagnostics, reset model runtime

## Stack

- React + Vite + TypeScript
- WebLLM (in-browser model inference)
- IndexedDB (messages, rolling summary memory, settings)
- `vite-plugin-pwa` for installable offline-ready behavior
- GitHub Pages deployment via GitHub Actions

## Features

- Mobile-first chat UI with stop generation support
- Status indicators (loading, ready, generating, error)
- Local model bootstrap with worker fallback to main thread
- Memory panel with pinned summary, search, and recent turns
- Settings for local-only mode, model selection, diagnostics, export/import memory

## Quick start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Install as PWA on phone

1. Deploy to GitHub Pages and open the PocketBrain URL on your phone.
2. In Safari (iOS): Share → **Add to Home Screen**.
3. In Chrome (Android): menu → **Install app** / **Add to Home Screen**.
4. Launch PocketBrain from your home screen for full-screen app mode.

## GitHub Pages deployment

1. Push repository to GitHub under `PocketBrain` (or update `vite.config.ts` base/scope if renamed).
2. In GitHub, enable Pages source as **GitHub Actions**.
3. Push to `main`; workflow builds and deploys static assets.

## Notes

- WebLLM downloads model artifacts at runtime and caches in browser storage.
- No model weights are bundled in this repository.
- This starter is local-first and intentionally dependency-light.

## License

Apache-2.0. See [LICENSE](./LICENSE).
