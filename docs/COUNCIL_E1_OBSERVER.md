# PocketBrain Research Council E1 Observer

**Status: local-only browser viewer, source UNVERIFIED, SIMULATED / authority NONE.**

This is PocketBrain's independent receiving-side implementation of [NBGPocketMesh Research Council E1](https://github.com/MichaelWave369/NBGPocketMesh/blob/main/docs/FLEET_COUNCIL_E1.md), following the [ThinkTank E1-A read-only consumer](https://github.com/MichaelWave369/think-tank/blob/main/docs/POCKETMESH_E1_CONSUMER.md).

## Use

1. Launch PocketBrain and complete the existing onboarding if necessary.
2. Open the **Council** tab, new at `/council`.
3. Manually select an **explicitly public synthetic** PocketMesh E1 JSON file (at most 64 KiB).
4. The browser checks the strict three-seat schema, source SHA format, E0 parent lineage, typed actions, and SHA-256 of each receipt plus the envelope.
5. See the bounded, review-only summary with no source-authentication or scientific-verification claims.
6. Clear the preview, or select another file. Reloading the page also clears the view.

The input is held only in transient component-local state for parsing; the UI saves neither the imported JSON nor the categorical review. The viewer does **not** use IndexedDB, localStorage, PocketBrain chat memory, bridge credentials, WebLLM, PhiServe, sync, fetch, or other network calls. Imported data is never passed to an LLM as an instruction. Unlike ordinary PocketBrain chat, this viewer is a separate explicitly initiated inspection workflow.

## Trust and verification

- Only `nbg-pocketmesh.council-evidence-exchange-e1.v0.1` is accepted. Unknown properties, later schema revisions, extra seats, wrong repository mapping, duplicate/reordered seats, altered digests, source SHA errors, unsupported privacy tiers, and false model/evidence/authorization claims are rejected.
- `HYPOTHESIS_ONLY` ThinkTank, `DISPLAY_ONLY` PocketBrain and `REVIEW_ONLY` Vessie are fixed, ordered, and never granted executive powers.
- Actions must be paired consistently for the coarse-vs-rich Keyhole comparison; that is a **synthetic categorical indicator**, not a measured NBG/Altermath or particle-physics claim.
- Every source SHA remains `DECLARED_UNVERIFIED`. Hashes are **self-consistency checks only**, not digital signatures or GitHub origin validation. Even a fully recomputed fabricated packet can pass, so the UI always labels it *HELD_UNTRUSTED_REVIEW_ONLY*.
- No PhiKernel warrants, Agentora dispatch, PhiMada mutations, BrainC inference, GAIA symbolic interpretation, Vessie approval, live ThinkTank council, or sharing is enabled.

## Tests

```sh
npm run test:council
npm run verify
```

The 12 targeted tests build independent synthetic E1 packets, check positive and null witness cases, source/lineage drift, wrong role/seat/action, false physical-evidence tiers, forged authority even with recomputed digests, extra memory/prompt payloads, and the non-attestation of self-consistent fabrications.

The browser-specific visual and file-picker behavior still requires manual QA on a deployed build. Passing TypeScript, Node and bundle tests is **not** proof of physical-device acceptance.

## Next gate

Vessie should receive the same typed envelope as a **review-only, operator-selected local file**. An independently sourced PocketMesh export can then be tested against both receiving projects. Only after real authentication, privacy controls and human approval could we design an actual network transfer, and that remains a separate project.
