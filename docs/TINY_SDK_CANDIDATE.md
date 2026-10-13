# PocketBrain Tiny SDK v0.1 candidate

**Stage: experimental SDK candidate.** This PR is an extraction/adaptation boundary, not a published, immutable NPM package, proven cross-repo integration, or production inference deployment.

## What another app receives

A lightweight importable browser module at:
`https://michaelwave369.github.io/PocketBrain/sdk/v0.1/index.mjs`

The entrypoint is version-labeled, but **its imported upstream adapter remains a live mutable file on the PocketBrain site**. Do not claim reproducible production builds or security from the versioned URL alone. Adopt a revision-pinned copy/package with verified digests before production use. Cross-origin module imports depend on normal browser CORS policies; verify this on target sites.

This SDK candidate currently depends on the original PocketBrain Tiny ONNX adapter at `../../pocketbrain-tiny.mjs`, which in turn loads a versioned Transformers.js runtime from jsDelivr and the ONNX checkpoint/tokenizer from Hugging Face **only when `client.load()` is invoked**. Merely importing or constructing the SDK does not start inference, load the runtime CDN, or download weights. Network requests for importing our JS module itself still occur, of course.

### Consumer example

```js
import { createPocketBrainTinyClient } from
  'https://michaelwave369.github.io/PocketBrain/sdk/v0.1/index.mjs';

const client = createPocketBrainTinyClient();

// Only after a user's explicit Load button interaction:
await client.load({ preferredDevice: 'auto' });

const { text, receipt } = await client.generate(
  'Give one concise example of human-AI collaboration.',
  {
    mode: 'baseline',
    maxNewTokens: 64,
    onText: partial => console.log(partial),
  }
);
console.log(text, receipt);
await client.dispose();
```

Local demonstration after merge: `/PocketBrain/tiny-sdk-demo.html`. This uses the SDK interface rather than importing the model adapter in page code.

### Interface

- `createPocketBrainTinyClient({ onStateChange? })`: constructs without model download; dependency injection of `loadRuntime` is for contract tests.
- `getStatus()`: immutable snapshot of `idle|loading|ready|generating|error|disposed`, backend, model, completed-run count and last error.
- `load({ preferredDevice, onProgress })`: explicit initialization. Shares concurrent load requests; rejects disposal during loading.
- `generate(prompt, { mode, maxNewTokens, onText })`: requires ready state. Returns final model text + self-reported receipt. Rejects overlapping generation and does not fall back to a network service.
- `dispose()`: releases the model, then makes the instance terminal. New load requires a new instance.

This makes **one loaded model per SDK client**. Multiple independent apps/tabs may download or hold duplicate weights; this is not shared-model residency. No memories, prompts or receipts are saved or sent anywhere by the SDK. The caller controls any storage and uploads. The same earlier model provenance and Apache-2.0 notices apply; our wrapper code remains MIT.

### Evidence ledger

**User-reported 2026-10-12 real-browser baseline, PocketBrain Tiny v0.2**:
- ONNX SmolLM2-135M, WebGPU q4f16.
- 64-token maximum; returned coherent 149-character answer to a 48-character prompt.
- 323.00 ms generation wall; 61.00 ms first token callback; 103.50 ms first visible text; 26 observed token callback events.
- 80.50 JS callback events/s over **full generation wall time**, not GPU decode tokens/s.
- 722.80 ms initialization, cache status NOT_MEASURED.
- Independent parity NOT_TESTED; no paired guarded-mode comparison yet.

This is an **operator-reported single run**, not a lab-controlled independent benchmark and not evidence of SDK functionality. SDK demo and contract tests are new and require browser validation.

### Promotion gates

- [ ] SDK demo actually loads and generates from a distinct consumer in Chrome WebGPU.
- [ ] SDK production build works from another origin with CORS and a user-click-only permission boundary.
- [ ] WASM and mobile runtime compatibility evidence.
- [ ] Pin the exact ONNX revision and tokenizer artifacts, verify hashes; remove mutable upstream-file dependency from the v0.1 URL.
- [ ] Compare baseline/guarded on the same prompt with run receipts, assess repetition, hallucinations and latency.
- [ ] Controlled independent ONNX reference parity and repeatable perf trials.
- [ ] Human approval before integrating into PorchTalk, Domistika, Vessie or the routing stack.

**Ledger above ego.**
