# Architecture

PocketBrain is local-first by design: memory and retrieval live on-device regardless of inference provider.

## Runtime layers

- `src/providers/*`
  - Provider abstraction with normalized generate/generateStream/interrupt flow
  - Implementations:
    - Local WebLLM provider
    - Ollama bridge provider
    - OpenAI-compatible bridge provider
- `src/model/*`
  - WebLLM worker + service helpers used by local provider
- `src/retrieval/retriever.ts`
  - BM25-style lexical ranking, recency blending, strict context budget
- `src/memory/*`
  - IndexedDB persistence for messages, rolling summary, and settings
- `src/pages/*`
  - Chat, Memory, Settings UI

## Request flow
1. User sends message.
2. Retrieval composes context from pinned summary + relevant memory + recent turns.
3. Provider registry routes request to configured provider.
4. Provider streams/generates assistant output.
5. Final messages persist to IndexedDB and summary updates.

## Privacy boundary
- Local mode: no remote endpoint calls.
- Bridge mode: only compiled prompt is sent to configured endpoint.
- Memory database remains local to the browser.
