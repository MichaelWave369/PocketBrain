# Φ Memory Polyglot R2 | PocketBrain reader preview

Experimental, synthetic-only and entirely offline. This is **not live TMC synchronization**.

The static lab at `/polyglot-r2-lab.html` previews a **PocketBrain-addressed** JSON envelope from TMC's R2 contract using `public/polyglot-r2.mjs`. It does **not** fetch TMC content, store data in IndexedDB, submit prompts to models, update PocketBrain's summary, or call any APIs. The demonstration button uses a fictional VR requirement and a **deliberately dummy** all-zero fingerprint.

You may optionally open a local JSON file; the page displays its contents through `textContent` only. Use **synthetic files** while TMC's HTTP authentication and the actual consumer trust channel are unfinished. A structurally valid R2 envelope is easy to forge and **is not proof of provenance, consent or accuracy**.

Safety checks: strict schema and reader, exact field sets, mandatory unverified evidence status, ephemeral-only retention, max 1024 characters of text, max 8 tags of up to 64 characters, and a 64-character lowercase hexadecimal source change indicator. The latter is **not a cryptographic signature**.

Run `npm run test:polyglot` or `npm run verify` for deterministic parser tests. The lab is a manual opt-in feature and does not modify normal chat behavior. A later rung needs authenticated, operator-approved transport, consent-gated in-session retrieval, revocation propagation and tests before any real memory use.
