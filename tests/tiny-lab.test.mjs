import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TINY_MODEL_ID, TINY_RUNTIME_URL, TINY_MAX_NEW_TOKENS,
  selectTinyBackend, buildTinyMessages, extractTinyReply, createTinyRunner,
} from '../public/pocketbrain-tiny.mjs';
import { TINY_MODES, TINY_RUN_SCHEMA, selectTinyGeneration, createTinyRunReceipt } from '../public/pocketbrain-tiny-metrics.mjs';

test('fixed browser model, runtime version, and supported backend decisions', () => {
  assert.equal(TINY_MODEL_ID, 'onnx-community/SmolLM2-135M-Instruct-ONNX-GQA');
  assert.match(TINY_RUNTIME_URL, /@3\.8\.1$/);
  assert.equal(TINY_MAX_NEW_TOKENS, 96);
  assert.deepEqual(selectTinyBackend('auto', false), { device: 'wasm', dtype: 'q8' });
  assert.deepEqual(selectTinyBackend('auto', true), { device: 'webgpu', dtype: 'q4f16' });
  assert.throws(() => selectTinyBackend('webgpu', false), /WebGPU is unavailable/);
  assert.throws(() => selectTinyBackend('unknown', true), /Unknown device/);
});

test('bounded prompts and exact extracted assistant output', () => {
  assert.throws(() => buildTinyMessages('  '), /Enter a prompt/);
  const messages = buildTinyMessages('   Hello   ', { context: 'x'.repeat(5000) });
  assert.equal(messages[1].content.length, 'User-selected local context: '.length + 3000);
  assert.equal(messages[2].content, 'Hello');
  assert.equal(extractTinyReply([{ generated_text: [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'Real model answer' }] }]), 'Real model answer');
  assert.equal(extractTinyReply([{ generated_text: ' Text ' }]), 'Text');
  assert.equal(extractTinyReply(null), '');
});

test('baseline and repeat guard are deterministic, explicit and bounded', () => {
  assert.deepEqual(Object.keys(TINY_MODES), ['baseline', 'guarded']);
  const baseline = selectTinyGeneration('baseline', 64);
  assert.equal(baseline.options.do_sample, false);
  assert.equal(baseline.options.repetition_penalty, 1);
  assert.equal(baseline.options.no_repeat_ngram_size, 0);
  const guarded = selectTinyGeneration('guarded', 999);
  assert.equal(guarded.options.max_new_tokens, 96);
  assert.equal(guarded.options.repetition_penalty, 1.12);
  assert.equal(guarded.options.no_repeat_ngram_size, 3);
  assert.throws(() => selectTinyGeneration('invented', 64), /Unknown generation mode/);
});

test('timing receipts disclose observed events and never contain text', () => {
  const receipt = createTinyRunReceipt({
    model: TINY_MODEL_ID, device: 'webgpu', dtype: 'q4f16', mode: 'guarded',
    config: selectTinyGeneration('guarded', 64).options,
    runNumber: 2, startMs: 100, firstTokenMs: 150,
    firstVisibleTextMs: 160, finishMs: 300,
    tokenCallbackEvents: 20, inputChars: 17, outputChars: 24,
  });
  assert.equal(receipt.schema, TINY_RUN_SCHEMA);
  assert.equal(receipt.generation_wall_ms, 200);
  assert.equal(receipt.time_to_first_token_callback_ms, 50);
  assert.equal(receipt.time_to_first_visible_text_ms, 60);
  assert.equal(receipt.callback_events_per_second_full_wall, 100);
  assert.equal(receipt.prompt_or_output_text_in_receipt, false);
  assert.equal(receipt.external_reference_parity, 'NOT_TESTED');
});

test('fake model is used ONLY for testing callbacks, completion and concurrency contracts', async () => {
  let time = 0;
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const observed = [];
  class FakeTextStreamer {
    constructor(_tokenizer, options) { this.options = options; }
  }
  const mockPipeline = async (_messages, config) => {
    observed.push(config);
    await blocked;
    time = 35;
    config.streamer.options.token_callback_function([1n]);
    time = 50;
    config.streamer.options.callback_function('One ');
    time = 65;
    config.streamer.options.token_callback_function([2n]);
    config.streamer.options.callback_function('answer.');
    time = 100;
    return [{ generated_text: [{ role: 'assistant', content: 'One answer.' }] }];
  };
  mockPipeline.tokenizer = {};
  const brain = createTinyRunner({
    generator: mockPipeline, TextStreamer: FakeTextStreamer,
    device: 'wasm', dtype: 'q8', now: () => time,
  });
  const previews = [];
  const pending = brain.generateWithReceipt('hello', { mode: 'guarded', onText: (v) => previews.push(v) });
  await assert.rejects(brain.generate('second'), /already has a generation/);
  await assert.rejects(brain.dispose(), /Cannot dispose/);
  release();
  const { text, receipt } = await pending;
  assert.equal(text, 'One answer.');
  assert.deepEqual(previews, ['One ', 'One answer.', 'One answer.']);
  assert.equal(receipt.generation_wall_ms, 100);
  assert.equal(receipt.time_to_first_token_callback_ms, 35);
  assert.equal(receipt.time_to_first_visible_text_ms, 50);
  assert.equal(receipt.observed_token_callback_events, 2);
  assert.equal(receipt.mode, 'guarded');
  assert.equal(receipt.run_index_this_session, 1);
  assert.equal(observed[0].no_repeat_ngram_size, 3);
  await brain.dispose();
  await assert.rejects(brain.generate('hello'), /disposed/);
});

test('model load remains opt-in and UI/manifest do not pretend validation', () => {
  const shell = readFileSync(new URL('../public/tiny-lab.html', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../public/tiny-lab.mjs', import.meta.url), 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('../public/tiny-model.json', import.meta.url), 'utf8'));
  assert.match(shell, /id="load"/);
  assert.match(shell, /id="mode"/);
  assert.match(shell, /id="copy-receipt"/);
  assert.match(ui, /loadButton\.addEventListener\('click'/);
  assert.match(ui, /generateWithReceipt/);
  assert.equal(manifest.browser_model, TINY_MODEL_ID);
  assert.equal(manifest.weight_bytes_bundled, false);
  assert.equal(manifest.production_ready, false);
});
