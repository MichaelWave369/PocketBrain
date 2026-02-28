# Architecture

PocketBrain uses a modular structure to keep model logic, memory, retrieval, and UI separate.

## Modules

- `src/model/webllmService.ts`
  - Initializes WebLLM engine
  - Sends completion requests
- `src/memory/indexedDb.ts`
  - IndexedDB CRUD for messages, summary, and settings
  - Export/import helpers
- `src/memory/summary.ts`
  - Rolling summary update logic
- `src/retrieval/retriever.ts`
  - Context builder: pinned summary + recent turns
- `src/pages/*`
  - Chat, Memory, Settings presentation and interaction

## Data flow

1. App starts and loads persisted messages/summary/settings from IndexedDB.
2. App initializes WebLLM with selected model.
3. User sends a message.
4. Retrieval composes context from summary + recent messages.
5. Model generates assistant reply.
6. User + assistant turns are saved to IndexedDB.
7. Rolling summary is updated and persisted.

## Storage schema

- `chat_messages` store: each chat turn
- `memory_summary` store: one pinned rolling summary
- `settings` store: app settings record
