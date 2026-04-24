# PocketBrain Portfolio Brief

## Problem
People want a personal AI assistant that works on their phone, respects privacy, and keeps long-term context without requiring account creation or always-on cloud services. Most AI chat products trade away ownership of data and transparency for convenience.

## Solution
PocketBrain delivers a private, phone-first AI brain that runs directly in the browser. It stores memory locally, supports offline-first workflows, and allows optional user-controlled bridge mode when stronger remote models are needed.

## Technical Stack
- TypeScript + React
- Vite production build pipeline
- IndexedDB for on-device memory persistence
- WebLLM for local in-browser inference
- Optional Ollama/OpenAI-compatible bridge integrations
- Web Crypto APIs for encrypted backup and restore
- Progressive Web App (PWA) installability

## Key Engineering Features
- Local memory loop with recency + retrieval patterns over private notes
- Local WebLLM provider mode for browser-native AI usage
- Configurable bridge mode with user-defined endpoint, model, and credentials
- Encrypted export/import backup flow for portable user-owned data
- PWA packaging and deployment readiness for mobile-first usage

## Privacy / Local-First Design
PocketBrain is designed to keep user data on-device by default. Conversations, memory, and artifacts remain local unless a user explicitly enables bridge mode and chooses an endpoint. This architecture reduces default data exposure and gives users direct control over where prompts are sent.

## Freelance Relevance
PocketBrain demonstrates practical, production-oriented frontend engineering for privacy-sensitive AI applications. It showcases mobile-first UX thinking, browser platform capabilities (IndexedDB, Web Crypto, PWA), clean integration boundaries for multiple model providers, and release-ready tooling suitable for client delivery.
