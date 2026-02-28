# Architecture

PocketBrain keeps model logic, memory, retrieval, and UI isolated so each area can evolve independently.

## Modules

- `src/model/worker.ts`
  - WebLLM worker entry via `WebWorkerMLCEngineHandler`
- `src/model/webllmService.ts`
  - Bootstrap via worker (`CreateWebWorkerMLCEngine`) with main-thread fallback
  - Streaming and non-stream generation helpers
  - Model stop/reset and lightweight diagnostics
- `src/memory/indexedDb.ts`
  - IndexedDB CRUD for messages, summary, settings
  - Export/import helpers
- `src/memory/summary.ts`
  - Rolling summary updates
- `src/retrieval/retriever.ts`
  - Tokenizer + BM25-style lexical scoring + recency blending + context budgeting
- `src/pages/*`
  - Chat, Memory, Settings UI interactions

## Data flow

1. App loads messages/summary/settings from IndexedDB.
2. App loads curated model list + device diagnostics.
3. App boots model (worker preferred), reporting progress text/percent.
4. On send, retriever builds compact context with strict budget.
5. Model streams assistant tokens into chat UI.
6. Final user/assistant turns persist to IndexedDB.
7. Rolling summary updates and persists.
