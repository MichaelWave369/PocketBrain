# Bridge Pairing Contract

PocketBrain can pair with a trusted LAN bridge instead of scanning entire subnets.

## Why pairing-first
- More private than blind network scans
- More reliable across browser security constraints
- Clear user intent and trusted endpoint list

## Browser constraints
- Browsers may require local-network permission for LAN hosts
- CORS must allow browser-origin requests
- Firewalls/router isolation can block phone-to-PC traffic

## Pairing payload format
```json
{
  "version": 1,
  "providerType": "ollama-bridge",
  "baseUrl": "http://192.168.1.20:11434",
  "modelName": "llama3.2:3b",
  "apiPath": "/api/generate",
  "displayName": "Desk GPU",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

## Optional desktop helper contract (future)
A tiny desktop companion may expose:
- `GET /health`
- `GET /models`
- `GET /pairing`
- `POST /transcribe` (optional future)
- `POST /v1/chat/completions` or Ollama-compatible route

## Security warnings
- Do not expose bridge endpoints publicly without authentication.
- Prefer LAN-only binding and firewall restrictions.
- API keys/tokens should be user-managed and revocable.

## Example endpoints
- Ollama: `http://192.168.x.x:11434`
- OpenAI-compatible: `http://192.168.x.x:8000/v1`
- Local DNS alias: `http://pocketbrain.local:11434`
