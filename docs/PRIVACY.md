# Privacy

PocketBrain defaults to local-only behavior.

- Chats, summaries, voice notes, and image memories are stored locally in IndexedDB.
- No hidden telemetry.
- No mandatory cloud account.

## Bridge mode
When enabled, PocketBrain sends compiled prompts to the user-configured endpoint only.

## Voice and camera
- Microphone and camera access require explicit browser permissions.
- Captured media remains local unless user explicitly exports/syncs/analyzes via bridge.

## Sync
- Sync requires explicit trusted-device pairing.
- Users can revoke trusted devices at any time.
