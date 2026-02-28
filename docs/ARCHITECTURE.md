# Architecture

PocketBrain is a local-first browser app built with React + Vite.

## Runtime layers
1. UI/pages/components (chat, memory, capture, settings)
2. Provider layer (local WebLLM, Ollama bridge, OpenAI-compatible bridge)
3. Memory layer (IndexedDB for chats, summaries, voice notes, image memories, trusted peers)
4. Retrieval/indexing layer (text-only retrieval from valid fields)
5. Backup/sync layer (encrypted backup packages + pairing-first sync protocol)

## v0.5 additions
- Browser-native TTS subsystem
- Camera/image ingestion and local image store
- Private sync protocol scaffolding with trusted device records

## Data boundaries
- Memory/retrieval are local by default.
- Bridge routes prompt generation only when user enables it.
- Image analysis via bridge is explicit opt-in.
