# PocketBrain

PocketBrain is a phone-first Progressive Web App (PWA) starter template for running a small local language model in the browser with private, local memory.

## Stack

- React + Vite + TypeScript
- WebLLM (in-browser model inference)
- IndexedDB (messages, summary memory, settings)
- `vite-plugin-pwa` for installable offline-ready behavior
- GitHub Pages deployment via GitHub Actions

## Features

- Mobile-first chat UI
- Model status indicators (loading, ready, generating, error)
- Local model bootstrap (no model weights committed to repo)
- Memory panel with pinned summary + recent turns
- Settings for local-only mode toggle, model placeholder, export/import memory

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

## GitHub Pages deployment

1. Push repository to GitHub under `PocketBrain` (or update `vite.config.ts` base/scope if renamed).
2. In GitHub, enable Pages source as **GitHub Actions**.
3. Push to `main`; workflow will build and deploy static assets.

## Notes

- WebLLM downloads model artifacts at runtime and caches in browser storage.
- The included default model ID is a starter choice and may be adjusted based on browser/device limits.
- This is a starter app intended for extension with stronger retrieval/ranking and streaming UX.

## License

Apache-2.0. See [LICENSE](./LICENSE).
