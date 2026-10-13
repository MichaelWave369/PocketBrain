# PocketBrain Tiny: browser inference lab (experimental)

This is a **separate, explicitly activated research page**, not a replacement for the existing WebLLM provider and not yet a production SDK. Open `/PocketBrain/tiny-lab.html` when deployed on GitHub Pages, or `/tiny-lab.html` on a Vite local server. The Settings page links to it.

## What actually runs

- Model family: `HuggingFaceTB/SmolLM2-135M-Instruct` (publisher license: Apache-2.0).
- Browser derivative: `onnx-community/SmolLM2-135M-Instruct-ONNX-GQA` (ONNX).
- Execution runtime: external pinned-version Transformers.js 3.8.1 ES module via jsDelivr, loaded **only after clicking Load**.
- WebGPU -> `q4f16`; unavailable WebGPU -> CPU/WASM `q8`. A failed WebGPU initialization does not silently reattempt as CPU.
- The adapter `public/pocketbrain-tiny.mjs` exports `createPocketBrainTiny()`, `buildTinyMessages()`, and extraction/selection utilities for future SDK extraction.

**No original PhiStream checkpoint, ONNX model bytes, or tokenizer are committed here.** The checkpoint from `D:\PhiStream\Models\SmolLM2-135M-Instruct` stays untouched. This is a derivative checkpoint from the same model family, not byte-identical to the BF16 safetensors and not independently parity-validated. No original PhiStream throughput result transfers to this integration.

## Explicit network and privacy boundary

Opening the lab alone does not fetch runtime or model weights. Clicking Load downloads executable code from jsDelivr and model files from Hugging Face. Initial download can exceed 100 MB. Model files may be cached; no guaranteed offline warm start across browsers, app origins, storage eviction, or browser sessions. Once loaded, text generation happens on the user's browser device. This implementation does not send prompts to an inference API, but ordinary external download requests expose network metadata to those services. Users should inspect dependencies and third-party terms before enabling. Runtime is version-pinned, but upstream model files are not revision-pinned or cryptographically verified yet; `public/tiny-model.json` records an externally published q4f16 digest **for reference only**.

## Try it

1. Browse to the experimental lab and choose Auto, WebGPU, or CPU/WASM.
2. Click **Load real model**. Review download, device, and errors.
3. Enter a short prompt and click Generate. The output comes from actual model inference if initialization succeeds; no canned responses are used.
4. Refresh: the engine reinitializes, but the browser may reuse downloaded files from cache.

CI only checks JavaScript API contracts, manifest consistency, and explicit-consent wiring using `npm run test:tiny`. **CI does not execute a pretrained checkpoint**, download model artifacts, or verify response accuracy or benchmark performance.

## Local development

```sh
npm ci
npm run test:tiny
npm run build
npm run dev
```

The Vite production build copies `public/tiny-lab.html`, `public/tiny-lab.mjs`, `public/pocketbrain-tiny.mjs`, and the manifest into its output. No new NPM dependency is required by the current app build because the opt-in lab loads its runtime from a versioned CDN.

## Promotion gates

- [ ] Real browser smoke test on Chrome desktop, phone, and no-WebGPU browser; capture environment and failure evidence.
- [ ] Confirm ONNX+tokenizer provenance and vendor license notices, pin exact model revision, and verify downloaded artifact hashes.
- [ ] Compare generation with a known independent reference on the same **ONNX** weights and tokenization; record deterministic prompts and outputs.
- [ ] Measure first load, warm load, time to first token, throughput, memory and browser cache behavior. This lab measures only end-to-end generation wall time.
- [ ] Package/test an internally hosted runtime (remove external CDN execution) for stable releases.
- [ ] Only after tests, add `local-smollm2` to the PocketBrain provider registry, then expose a versioned SDK for other repos and an approved Vessie connector.

No unconditional background prefetch, global auto-routing, or hidden cloud fallback is authorized. **Ledger above ego.**
