# Φ Memory Polyglot R3 | Signed, encrypted offline courier

**Status: research / synthetic-only.** Builds on merged R0/R1/R2. No new public/loopback endpoints. No automatic sync, app authentication, real personal memory export, backend import, or model context injection.

## Design

1. A trusted **local operator process** authorizes a precise TMC `ApprovalItem` and issues an R1 one-use token scoped to capsule revision + reader + profile + vault + workspaces.
2. TMC's R3 producer consumes the one-use token through R2's policy-checked read-only projection, then encrypts that bounded reader-specific view with **AES-256-GCM** using **PBKDF2-HMAC-SHA256 (310,000 iterations)** and random 16-byte salt + 12-byte IV.
3. TMC signs the resulting courier header and ciphertext with an **operator-provisioned ECDSA P-256 SHA-256** key. The signature uses IEEE P1363 64-byte `r||s` representation for browser interoperability.
4. A recipient independently pins the TMC signing public key **outside the package** and gets the passphrase through a different trusted channel. Only then does it verify the signature, decrypt the content and validate the R2 audience/fields before displaying unverified data.

R3 uses `schema=phi.memory.polyglot.courier.r3` and exactly eight outer fields: `schema`, `reader`, `issued_at`, `expires_at`, `salt`, `iv`, `ciphertext`, `signature`.

The signature covers these seven ASCII newline-delimited fields, in order: `schema`, `reader`, `issued_at`, `expires_at`, `salt`, `iv`, `ciphertext`. AES-GCM AAD covers the first four. All binary values are unpadded base64url. The permitted time window is **1–300 seconds**, enforced by compliant readers at open time.

## Security boundaries

- R3 is a **signed file exchange, not live authentication**. A trusted signer pin authenticates the package's signing key, **not** the underlying memory's factual accuracy, reader identity or human approval. Never trust a key bundled by an untrusted sender as your pin.
- PBKDF2 mitigates but does not eliminate **offline password guessing**. The package is copyable. Use a high-entropy, unique out-of-band passphrase. Neither the passphrase nor signing private key belongs in a repo, CI secret fixture, URL, local logs, or static website.
- A recipient may copy decrypted content. Expiration is an app check, **not cryptographic erasure or revocation**. R1's one-use/revocation rules apply **before export** and cannot retract a file already distributed.
- AES-GCM and ECDSA provide encryption and integrity only when correctly used with a **trusted pin**. This build is not independently security audited and does not fix TMC's existing unauthenticated HTTP API, legacy XOR vault, or approvals writable through that API.
- Do not serve actual memory files on GitHub Pages, provide a web memory endpoint, persist decrypted contexts to IndexedDB, pass them into model prompts, or treat untrusted memory as system/tool instructions.
- Synthetic fixtures deliberately use a disclosed passphrase and public test key. Their private key is not checked into source. The static fixture is dated **2027-09-02** and is intended for tests with a frozen clock, not as a live package today.

## Verification

- TMC: `python -m pip install -e '.[dev,polyglot]'` then `python -m pytest -q tests/test_memory_polyglot_courier_r3.py`.
- BrainC: `python -m pytest -q tests/test_polyglot_courier_r3.py` after installing test-only `cryptography` and `pytest`.
- PocketBrain: `node --test tests/polyglot-r3.test.mjs` or `npm run verify`; browser lab at `/polyglot-r3-lab.html`.
- A single Python-generated synthetic test vector is shared across BrainC/PocketBrain fixtures and verified independently by both readers.

**Next gate for live memory use:** OS-keystore protection and rotation for signer keys, authenticated and independently approved TMC operator actions, authenticated app pairing, secure delivery transport, deletion/revocation semantics, and an adversarial security review. No real user memories until these gates are satisfied.

## PocketBrain browser reader

`public/polyglot-r3.mjs` is a strict WebCrypto verifier/decryptor. It uses the public-key PEM independently provided by the operator to verify the signature *before* attempting password KDF/decryption. It then applies `parsePolyglotR2` to preserve PocketBrain's compact, unverified, ephemeral-only contract.

`public/polyglot-r3-lab.html` offers (1) a one-click **self-signed** synthetic demo, entirely generated locally, and (2) an explicit synthetic file + public PEM + passphrase preview workflow. The checkbox records that you checked the signer key **outside** the page; it does not perform that verification for you. All content is rendered with `textContent`, never auto-stored.

**Do not import private TMC memory here** until the full identity/consent/revocation architecture is complete.
