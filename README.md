# PocketBrain v0.5.0

PocketBrain is a **private, phone-first, local-first AI brain**.

It prioritizes on-device memory and retrieval, with optional user-controlled bridge mode when you want a stronger remote model.

## 🚀 Try PocketBrain

**[Launch PocketBrain](https://michaelwave369.github.io/PocketBrain)** - Runs entirely in your browser. No signup, no tracking.

**Want to self-host?** Clone the repo and run `npm ci && npm run dev`

## Core product behavior
- **Local-first by default**: WebLLM runs in-browser, memory stays in IndexedDB.
- **Private memory loop**: pinned summary + recency + retrieval over local messages.
- **Optional bridge mode**: send compiled prompts only to endpoints you configure.
- **Voice notes**: capture audio locally; use browser speech recognition when available.
- **Trusted-device sync foundation**: pairing payloads + trusted bridge endpoint history.
- **Encrypted backup/restore**: PBKDF2 + AES-GCM in browser.
- **PWA + GitHub Pages** deployment support.

## Modes
### 1) Local WebLLM mode (default)
- Provider: `local-webllm`
- No bridge endpoint needed
- Memory/retrieval stay on device

### 2) Bridge mode (optional)
- Providers: `ollama-bridge`, `openai-compatible-bridge`
- Endpoint, model, and key are user-configured
- Retrieval remains local; only final prompt is sent to the bridge
- Fallback-to-local is supported when bridge init fails

## Voice notes and transcription
- Microphone capture always stores voice note locally.
- If browser speech recognition exists, transcript is inserted into draft.
- If not available, note is still saved and shown as non-transcribed.
- Bridge transcription is explicit/manual and provider-dependent.

## TTS
- The app currently focuses on text responses and voice input.
- Browser/provider TTS playback is not yet fully integrated into the default UX.

## Image capture and image memory indexing
- Image-memory retrieval hooks are now present in retrieval/search contracts.
- Full camera capture + persistent image memory UX is still in-progress.

## Trusted devices / sync foundation
- Pairing-first bridge workflow includes:
  - trusted endpoint history
  - pairing payload/file import/export
  - explicit known-host probe (no blind subnet scans)
- This is a foundation for future trusted-device sync experiences.

## Encrypted backup and restore
- Export plain or encrypted backup packages.
- Encrypted packages use browser Web Crypto (`PBKDF2` + `AES-GCM`).
- Import supports merge/replace mode.
- Wrong passphrase fails safely.

## Local setup
```bash
npm ci
npm run dev
```

## Verification / release checks
```bash
npm run lint
npm run build
npm run verify
```

`npm run verify` is a lightweight CI-safe integration check that catches contract drift between retrieval/provider interfaces.

## GitHub Pages deployment
1. Push to `main`
2. Enable Pages source = GitHub Actions
3. Actions build and deploy `dist`

## Current limitations
- Large WebLLM bundles produce large PWA assets; initial load can be heavy on low-end phones.
- Bridge transcription and bridge image-description support depend on endpoint model capability and API compatibility.
- Full camera-to-memory workflow is not yet complete in the UI.

## Privacy
No hidden telemetry. Bridge mode sends prompts only to endpoints you explicitly configure.

## License
Apache-2.0

## Getting Started

1. **Web**: Visit https://michaelwave369.github.io/PocketBrain
2. **Mobile**: Open the link on your phone and tap "Install" to add to home screen (PWA)
3. **Self-hosted**: Clone this repo and run:
```
npm ci
npm run dev
```

First run: Click "Get started" to configure your AI brain (local or bridge mode)

**Quick Tour**

- Record voice notes - Capture thoughts hands-free
- Local memory - Everything stays on your device in IndexedDB
- Ask your brain - Query what you've learned (uses WebLLM by default)
- Optional bridge - Connect to Ollama or OpenAI for stronger models
- Encrypted backup - Export and restore your memories safely

**Why PocketBrain?**

- Private by default - No telemetry, no tracking, no cloud required
- Local-first - Your memory stays under your control
- Offline-capable - Works without internet (except bridge mode)
- PWA - Install on your phone like a native app
- Open source - Full transparency and control
