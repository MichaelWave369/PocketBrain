# Architecture

PocketBrain is local-first and phone-first.

## Modules
- `src/providers/*`: inference provider abstraction and implementations (local WebLLM, Ollama bridge, OpenAI-compatible bridge)
- `src/voice/*` + `src/hooks/useVoiceInput.ts`: recording, browser transcription, voice state machine
- `src/bridge/*`: pairing payload handling and explicit known-host discovery probes
- `src/backup/*`: versioned backup packages and encryption/decryption (Web Crypto)
- `src/memory/*`: IndexedDB storage for messages, summary, settings, voice notes, trusted bridges
- `src/retrieval/retriever.ts`: BM25-style retrieval with recency and context budgeting

## Data flow
1. User sends text or voice-assisted draft.
2. Retrieval composes context from summary + relevant text + recent turns (+ transcript memories when available).
3. Provider routes generation to local or bridge backend.
4. Response persists locally with rolling summary update.
5. Voice notes persist locally; transcript indexing is opt-in by availability.

## Privacy boundary
- Local mode: inference + memory + retrieval on-device.
- Bridge mode: only compiled prompt crosses network to user-configured endpoint.
- Backup encryption runs locally via browser Web Crypto.
