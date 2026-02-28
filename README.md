# PocketBrain v0.3.0

PocketBrain is a phone-first Progressive Web App (PWA) starter for private memory-first chat.

## Core idea: Small phone, big brain

PocketBrain keeps **memory + retrieval local** on your phone, and can optionally borrow stronger reasoning from your LAN/home-lab model endpoint.

## Modes

### 1) Local Mode (default, privacy-first)
- In-browser WebLLM inference
- IndexedDB local memory
- No remote prompt transfer

### 2) Bridge Mode (optional)
- Route final compiled prompt to a user-configured endpoint:
  - Ollama on LAN (`http://192.168.x.x:11434`)
  - OpenAI-compatible server (`http://192.168.x.x:8000/v1`)
- Memory and retrieval remain local; only final prompt leaves the device

## v0.3.0 highlights
- Bridge provider architecture (Local WebLLM / Ollama / OpenAI-compatible)
- Streaming chat UX retained with unified provider routing
- Provider badge in chat header
- Bridge connection test in settings
- GitHub Actions lockfile/caching fix for npm

## Local development

```bash
npm ci
npm run lint
npm run build
npm run dev
```

## LAN Ollama quick setup
1. Run Ollama on your PC/server (`ollama serve`).
2. Ensure phone and host are on same network.
3. In PocketBrain Settings:
   - Provider: **Ollama Bridge**
   - Endpoint: `http://<LAN-IP>:11434`
   - Model: e.g. `llama3.2:3b`
4. Use **Test Bridge Connection**.

> If browser CORS blocks direct Ollama access, use a tiny local proxy in front of Ollama (documented in `docs/PRIVACY.md`), then point PocketBrain to that proxy.

## GitHub Actions lockfile fix summary
- Commit `package-lock.json` at repo root.
- Use `npm ci` in CI.
- Configure setup-node cache with:
  - `cache: npm`
  - `cache-dependency-path: package-lock.json`

## GitHub Pages deployment
1. Push to `main`.
2. In repo settings, set Pages source to **GitHub Actions**.
3. Workflow builds and deploys static output from `dist`.

## Troubleshooting
### “Dependencies lock file is not found” in GitHub Actions
Fix:
1. Commit `package-lock.json` at repository root.
2. Use `npm ci` (not `npm install`) in workflows.
3. Set `cache-dependency-path: package-lock.json` in `actions/setup-node`.

## Privacy note
PocketBrain sends prompts only to endpoints explicitly configured by the user in Bridge Mode. No hidden telemetry.

## License
Apache-2.0. See [LICENSE](./LICENSE).
