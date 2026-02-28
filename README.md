# PocketBrain v0.4.0

PocketBrain is a phone-first PWA for private memory-first AI chat.

## Small phone, big brain
PocketBrain keeps memory and retrieval local on your phone, and can optionally route final prompts to a trusted LAN bridge model.

## What’s new in v0.4.0
- Voice input with recording states, cancel/retry, elapsed timer, and graceful fallback when browser transcription is unavailable.
- Pairing-first bridge discovery (manual entry, trusted recents, pairing payload/file import/export, explicit known-host probe).
- Encrypted backup and restore (Web Crypto AES-GCM + PBKDF2) with merge/replace import modes.
- Voice notes stored locally, playable in Memory page, searchable only when transcript exists.

## Modes
### Local mode (default)
- WebLLM in browser
- Local IndexedDB memory and retrieval
- No remote prompt transfer

### Bridge mode (optional)
- Ollama bridge on LAN
- OpenAI-compatible bridge endpoint
- Memory and retrieval stay local; only compiled prompt is sent to endpoint configured by user

## Setup
```bash
npm ci
npm run dev
```

Build and checks:
```bash
npm run lint
npm run build
```

## GitHub Actions lockfile fix (kept)
- Root `package-lock.json` is committed.
- Workflow uses `npm ci`.
- setup-node cache points at `cache-dependency-path: package-lock.json`.

## Pairing-first LAN discovery
- Manual bridge endpoint entry
- Reconnect recent successful endpoint
- Pairing file import/export (JSON)
- QR payload copy/paste path
- Explicit known-host probe only after user action (no blind subnet scan)

## Voice input notes
- Browser asks for microphone permission.
- On supported browsers, speech recognition can insert transcript to draft.
- On unsupported browsers, voice note is still saved locally and clearly marked as non-transcribed.
- Bridge transcription is explicit/manual and currently stubbed by provider contract.

## Local network permission notes
Some browsers gate LAN calls behind local-network permission. If denied, bridge probes fail with clear errors.

## Encrypted backups
- Plain `.pocketbrain.json` export
- Encrypted `.pocketbrain.enc.json` export
- Encrypted export requires passphrase + confirmation
- Wrong passphrase on import fails safely
- Losing passphrase means encrypted backup cannot be recovered

## GitHub Pages deployment
1. Push to `main`
2. Enable Pages source = GitHub Actions
3. Workflow builds and deploys `dist`

## Troubleshooting
- **Microphone denied**: re-enable mic permission in browser site settings.
- **Speech recognition unavailable**: browser does not expose speech API; voice note is saved without transcript.
- **Bridge discovery blocked**: local-network permission or firewall blocked access.
- **CORS failure to LAN bridge**: configure bridge/proxy CORS headers.
- **Encrypted backup wrong passphrase**: import fails safely; retry with correct passphrase.
- **Actions lockfile issue**: keep root `package-lock.json`, use `npm ci`, and `cache-dependency-path: package-lock.json`.

## Privacy
No hidden telemetry. Bridge mode sends prompts only to the endpoint you explicitly configure.

## License
Apache-2.0
