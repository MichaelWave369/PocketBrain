# PocketBrain v0.5.0

PocketBrain is a phone-first, local-first PWA personal AI brain: it can listen, speak, see, remember, and privately sync across trusted devices.

## Core principles
- Local memory and retrieval first
- Optional bridge to stronger models you control
- Pairing-first sync, not cloud-account lock-in
- No hidden telemetry

## What's new in v0.5.0
- **Voice output (TTS):** assistant replies can be spoken with browser-native voices and per-message Speak controls.
- **Camera-to-memory ingestion:** capture or upload images, store locally, annotate, and include text fields in retrieval.
- **Private device sync foundation:** trusted-device pairing UI and manual-first sync workflow with versioned protocol envelopes.

## Existing capabilities retained
- Local WebLLM mode
- Bridge mode (Ollama + OpenAI-compatible)
- Voice input with graceful transcription fallback
- Pairing-first LAN bridge discovery
- Encrypted backup/restore
- GitHub Actions lockfile fix

## Setup
```bash
npm ci
npm run dev
```

Checks and build:
```bash
npm run lint
npm run build
```

## Bridge vs Sync
- **Bridge** sends prompts to a configured model endpoint (LAN/server).
- **Sync** keeps PocketBrain data aligned between trusted devices.

Bridge sends prompts only to endpoints you explicitly configure.

## Camera and image memory
- Capture from camera or upload files.
- Images are saved locally with metadata.
- Search works only from text fields (caption/notes/OCR/analysis), not raw pixels.

## TTS support notes
- Uses browser SpeechSynthesis.
- Voice list can load asynchronously.
- If unsupported/no voices, chat continues normally.

## GitHub Actions lockfile fix
- Root `package-lock.json` committed.
- `actions/setup-node@v4` + Node 20 + npm cache + `cache-dependency-path: package-lock.json`.
- Install uses `npm ci`.

## GitHub Pages
Push to `main` with Pages source set to GitHub Actions; workflow builds and deploys `dist`.

## Troubleshooting
- **Microphone denied:** allow mic permissions for site.
- **Speech recognition unavailable:** voice note still saves locally; transcription may be unavailable.
- **No voices available:** browser/OS may not expose TTS voices.
- **Speech interrupted:** backgrounding tab or audio focus can pause speech.
- **Camera denied:** allow camera permission and retry capture.
- **Image too large:** use smaller image or compression preference.
- **Bridge discovery blocked / CORS:** check local-network permission, firewall, and endpoint CORS config.
- **Sync pairing failure:** re-pair using fresh payload/QR and ensure both apps are active.
- **Encrypted backup wrong passphrase:** decryption fails safely; retry with exact passphrase.
- **Actions lockfile error:** commit root lockfile, use `npm ci`, set `cache-dependency-path: package-lock.json`.

## Docs
- `docs/ARCHITECTURE.md`
- `docs/PRIVACY.md`
- `docs/ROADMAP.md`
- `docs/BRIDGE_PAIRING.md`
- `docs/TTS.md`
- `docs/CAPTURE.md`
- `docs/SYNC.md`

## License
Apache-2.0
