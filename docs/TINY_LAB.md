# PocketBrain Tiny v0.2: browser inference and observability lab

The model remains an **opt-in experimental browser-only lab**, not PocketBrain's default provider. Open `/PocketBrain/tiny-lab.html` on GitHub Pages or `/tiny-lab.html` under Vite.

## Tested scope and source boundaries

- Base family: `HuggingFaceTB/SmolLM2-135M-Instruct`, Apache-2.0 license.
- ONNX derivative: `onnx-community/SmolLM2-135M-Instruct-ONNX-GQA`, different bytes from PhiStream's local BF16 safetensors.
- Runtime: Transformers.js 3.8.1, downloaded on demand from jsDelivr after Load; ONNX/tokenizer fetched from Hugging Face.
- Backend: WebGPU `q4f16` or WASM `q8`; no automatic retry silently moves prompts between devices.
- The model source revision and actual retrieved weight checksum are **not verified**. No weights are committed.

The v0.2 addition is a standalone, importable **candidate adapter**, `public/pocketbrain-tiny.mjs`, with:
- `createPocketBrainTiny()`, which explicitly starts downloading model/runtime assets;
- `brain.generate(prompt)` (retains the v0.1 string-returning method);
- `brain.generateWithReceipt(prompt, { mode, maxNewTokens, onText })` returning `{ text, receipt }`;
- deterministic `baseline` greedy vs `guarded` greedy options (penalty 1.12, no-repeat 3-gram).

### JS inference observations

Transformers.js `TextStreamer` invokes callbacks while the real model generates. The lab exposes a progressive preview; it uses the pipeline's final assistant text as authoritative after generation returns. The receipt reports:

- generation wall time including prompt preprocessing/prefill and JS overhead;
- time to first token callback, if observed;
- time to first visible text chunk, if observed;
- count of token callback **events** (not proven exact token count);
- callback events divided by total wall seconds (not a pure decode throughput number);
- selected backend, dtype, mode, requested token cap, run index in the current tab.

A receipt deliberately omits user text/output. It labels measured values `BROWSER_SELF_REPORTED_UNVERIFIED`; it does not include independent external model parity, cache hit proof, memory/VRAM measurement, or checkpoint hash validation. Run indices are per loaded model in a tab. Initialization is timed separately; caching is marked unknown, not cold or warm.

**The repeated words observed in the first real-model demo are not automatically removed.** The guarded mode changes token selection constraints, which may reduce looping or cause undesirable distortions. Compare the same input in baseline and guarded mode; do not interpret 1–2 runs as a statistically meaningful improvement.

### No background activity and privacy

Opening the page does not load the inference package or model. Clicking Load downloads executable code and model assets from third-party CDNs; normal network metadata is visible to those services, and external code supply-chain trust still matters. Actual prompt generation executes in the browser. The JSON receipt is only copied when the user clicks Copy. No remote telemetry or hidden prompt uploads are added.

### Checks

`npm run verify` runs type checking, production build, integration verification, and new mock-based Tiny contracts. CI uses a fake generator only to validate the adapter's callbacks, timing arithmetic, concurrency refusal, and explicit mode behavior. **Fake tests are not pretrained-model validation.** User-reported WebGPU generation in v0.1 establishes one live result, but v0.2 streaming/guard controls require fresh browser testing.

## Next promotion gates

- [ ] Live WebGPU baseline and guarded runs using the same prompts; record both receipts and full output quality.
- [ ] Try WASM and different browser/mobile hardware, including failure paths.
- [ ] Pin and verify model revision/tokenizer hashes and runtime supply chain.
- [ ] Reproduce actual model outputs against an independent reference for the exact ONNX weights.
- [ ] Record true cold/warm loading and controlled repeated time-to-first-token/throughput trials.
- [ ] Only then extract a stable SDK and wire it into Super Φ.Vessel's governed router.

**Ledger above ego.**
