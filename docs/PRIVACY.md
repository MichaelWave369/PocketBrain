# Privacy

PocketBrain defaults to local-first privacy.

## Local mode
- Inference, memory, and retrieval are local to the browser/device.
- Chat history lives in IndexedDB.

## Bridge mode
- Prompts are sent only to the endpoint configured by the user.
- Memory storage and retrieval still remain local.
- PocketBrain does not include hidden telemetry.

## Ollama LAN note
When connecting directly from browser to Ollama, CORS/network policy may block requests.

If blocked, place a minimal local proxy (same LAN) in front of Ollama and configure PocketBrain to call the proxy.
