# Privacy

PocketBrain defaults to local-only memory and retrieval.

## Local-first behavior
- Messages, summaries, settings, voice notes, and trusted bridges are stored in browser IndexedDB.
- No analytics or hidden telemetry are shipped.

## Bridge mode
- Prompts are sent only to endpoints explicitly configured by the user.
- Bridge pairing/discovery is user-driven; there is no blind subnet scanning.

## Voice
- Microphone capture is explicit by user interaction.
- If browser speech recognition is unavailable, audio remains local as a voice note unless user manually chooses bridge transcription.

## Backups
- Plain backups are readable JSON.
- Encrypted backups use PBKDF2 + AES-GCM in browser.
- Losing passphrase means encrypted backup cannot be recovered.

## CORS and LAN
Browsers may block LAN access due to CORS/local-network permissions. You may need a local proxy/helper with explicit CORS policy.
