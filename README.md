# PocketBrain v0.6.0

PocketBrain is a private, phone-first, local-first AI brain that runs in the browser, stores memory locally, and supports optional user-controlled bridge mode for stronger models.

Built by Michael Hughes / PHI369 Labs.

## What's new in v0.6.0
- Lazy-loaded WebLLM and chunked bundles for faster initial startup.
- Camera/image memory UX improvements and timeline support.
- Device sync UX upgrades including QR pairing and manual sync controls.
- Built-in TTS controls with browser fallback behavior.

Built by Michael Hughes / PHI369 Labs.


## What's new in v0.6.0
- Lazy-loaded WebLLM and chunked bundles for faster initial startup.
- Camera/image memory UX improvements and timeline support.
- Device sync UX upgrades including QR pairing and manual sync controls.
- Built-in TTS controls with browser fallback behavior.

## 🚀 Try PocketBrain

**[Launch PocketBrain](https://michaelwave369.github.io/PocketBrain)** - Runs entirely in your browser. No signup, no tracking.

**Want to self-host?** Clone the repo and run `npm ci && npm run dev`

## Portfolio Highlights
- Local-first browser AI app
- IndexedDB private memory loop
- WebLLM local provider support
- Optional Ollama/OpenAI-compatible bridge mode
- Encrypted backup/restore with Web Crypto
- PWA install support
- TypeScript/Vite production build

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
MIT

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


## PocketBrain Tiny (experimental browser lab)

Try the optional [Tiny Model Lab](https://michaelwave369.github.io/PocketBrain/tiny-lab.html) to initialize a real SmolLM2-135M ONNX derivative on demand. This is a **separate research lab**, not yet a new default chat provider or validated portable SDK. The original PhiStream BF16 checkpoint is not bundled or loaded. No new inference dependency is included in the main app; the experimental page explicitly downloads a versioned browser runtime and model artifacts only after clicking **Load real model**.

See [Tiny Lab documentation](docs/TINY_LAB.md) for provenance, privacy/consent boundaries, and promotion gates. Run `npm run test:tiny` for contract tests (which are not model inference tests).

**Tiny v0.2 candidate:** the lab now offers live model text previews, baseline/guarded decoding comparisons, and copyable local callback-based inference receipts. Try both modes on an identical prompt and inspect the actual outputs and measurements. The `generateWithReceipt(prompt, { mode, onText })` API is an experimental reusable adapter; it is not yet promoted as a stable SDK. Source CI does not test pretrained weights.


## PocketBrain Tiny SDK candidate (experimental)

A small reusable browser client is now being tested at `public/sdk/v0.1/index.mjs`. It enforces explicit model load, one-generation-at-a-time behavior, status receipts, and disposal, while reusing the real ONNX adapter. Start with the [consumer demo](https://michaelwave369.github.io/PocketBrain/tiny-sdk-demo.html) after merge/deploy, or inspect [SDK details](docs/TINY_SDK_CANDIDATE.md). No other repo is automatically modified. This is not an immutable production SDK yet.

## PhiServe same-device browser bridge (experimental)

PocketBrain offers a dedicated **PhiServe** provider. It uses the Ollama-style text API with a bearer token, bounded NDJSON streaming, and explicit cancellation. The local-memory / retrieval behavior remains unchanged; only compiled chat prompts are sent to the configured local daemon. This does **not** add an inference runtime to PocketBrain.

Prerequisite: PhiServe **v0.5.0 or newer** with the opt-in, authenticated browser bridge (see PhiServe `docs/BROWSER_BRIDGE.md`).

1. On the **same physical computer** as your browser, register a real GGUF model and provide a compatible `llama-server`.
2. Generate a secret file with `phiserve auth create --output "$HOME/.phiserve/bridge-token.txt"`.
3. Start `phiserve daemon --browser-origin https://michaelwave369.github.io --api-key-file "$HOME/.phiserve/bridge-token.txt" --llama-server /path/to/llama-server`. This still binds only to `127.0.0.1`.
4. In PocketBrain Settings, choose **PhiServe (same-device local bridge)**, endpoint `http://127.0.0.1:11435`, a **registered PhiServe model alias**, and your private bearer token. Click **Test Bridge Connection**.

**Browser caveat:** The browser may require local-network permission or block HTTPS-to-loopback requests. The bridge is not reachable from your phone, Quest, or another computer using `127.0.0.1`. A separate secure PhiOS gateway is future work. No remote LAN exposure has been introduced.

**Security:** A token grants access to your local models. Avoid third-party code/extension access to the trusted browser origin, never place the token in the URL, and disable `remember bridge settings` when you do not want credentials stored locally in the browser. PhiServe does not support multimodal, tools, or transcription through this text-only adapter. CI tests use mocked HTTP responses, not physical CUDA/GGUF inference.
