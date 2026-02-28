# Private Device Sync v0.5.0

PocketBrain sync is pairing-first and device-trust based.

- Bridge and Sync are different:
  - Bridge = inference endpoint routing.
  - Sync = data exchange between trusted PocketBrain devices.
- Sync is explicit and local-first, with manual-first controls.
- Trusted devices can be revoked at any time.

## Protocol
Sync messages use a versioned envelope with payload types such as:
- handshake-offer
- handshake-answer
- sync-preview
- sync-delta
- sync-complete
- error

## Safety
- No hidden telemetry.
- No forced cloud account.
- Pair before sync; never sync to unknown peers.
