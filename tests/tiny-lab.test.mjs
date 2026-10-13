import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TINY_MODEL_ID,
  TINY_RUNTIME_URL,
  TINY_MAX_NEW_TOKENS,
  selectTinyBackend,
  buildTinyMessages,
  extractTinyReply,
} from '../public/pocketbrain-tiny.mjs';

test('model ID and runtime are fixed references, not arbitrary fetch input', () => {
  assert.equal(TINY_MODEL_ID, 'onnx-community/SmolLM2-135M-Instruct-ONNX-GQA');
  assert.match(TINY_RUNTIME_URL, /@3\.8\.1$/);
  assert.equal(TINY_MAX_NEW_TOKENS, 96);
});
test('automatic CPU fallback is explicit in backend metadata', () => {
  assert.deepEqual(selectTinyBackend('auto', false), { device: 'wasm', dtype: 'q8' });
  assert.deepEqual(selectTinyBackend('auto', true), { device: 'webgpu', dtype: 'q4f16' });
  assert.throws(() => selectTinyBackend('webgpu', false), /WebGPU is unavailable/);
  assert.throws(() => selectTinyBackend('unsafe', true), /Unknown device/);
});
test('prompts are required and local context is bounded', () => {
  assert.throws(() => buildTinyMessages('  '), /Enter a prompt/);
  const messages = buildTinyMessages('   Hello   ', { context: 'x'.repeat(5000) });
  assert.equal(messages[0].role, 'system');
  assert.equal(messages[1].content.length, 'User-selected local context: '.length + 3000);
  assert.equal(messages[2].content, 'Hello');
});
test('only assistant output is extracted, without inventing a model response', () => {
  assert.equal(extractTinyReply([{ generated_text: [{ role: 'user', content: 'X' }, { role: 'assistant', content: 'Hello!' }] }]), 'Hello!');
  assert.equal(extractTinyReply([{ generated_text: ' Text ' }]), 'Text');
  assert.equal(extractTinyReply([{ generated_text: [{ role: 'user', content: 'X' }] }]), '');
  assert.equal(extractTinyReply(null), '');
});
test('browser lab is explicit consent and model files are not bundled', () => {
  const shell = readFileSync(new URL('../public/tiny-lab.html', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../public/tiny-lab.mjs', import.meta.url), 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('../public/tiny-model.json', import.meta.url), 'utf8'));
  assert.match(shell, /id="load"/);
  assert.match(ui, /loadButton\.addEventListener\('click'/);
  assert.equal(manifest.browser_model, TINY_MODEL_ID);
  assert.equal(manifest.weight_bytes_bundled, false);
  assert.equal(manifest.production_ready, false);
});
