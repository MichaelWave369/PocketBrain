# Bridge Pairing

Bridge pairing connects PocketBrain to a trusted inference endpoint (e.g., Ollama on LAN).

## Why pairing-first
Browsers cannot reliably/safely perform blind subnet scans. Pairing is explicit, auditable, and privacy-friendly.

## Typical endpoints
- `http://192.168.x.x:11434` (Ollama)
- `http://192.168.x.x:8000/v1` (OpenAI-compatible)

## Companion contract (future helper)
Potential helper endpoints:
- `/health`
- `/models`
- `/pairing`
- `/transcribe` (future)
- `/v1/chat/completions` or Ollama-compatible routes

## Security notes
- Do not expose a bridge publicly without authentication.
- Configure CORS for your trusted local origins.
- Local-network browser permission may be required on some platforms.
