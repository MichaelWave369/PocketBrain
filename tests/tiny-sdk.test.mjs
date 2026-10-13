import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPocketBrainTinyClient, POCKETBRAIN_TINY_SDK_VERSION } from '../public/sdk/v0.1/index.mjs';

function fakeRuntime(overrides = {}) {
  return {
    model: 'test-model',
    device: 'webgpu',
    dtype: 'q4f16',
    async generateWithReceipt(prompt, opts) {
      opts.onText?.('Generated ');
      return { text: 'Generated reply', receipt: {
        schema: 'POCKETBRAIN_TINY_RUN_V2', evidence: 'UNIT_FIXTURE_NOT_REAL_INFERENCE',
        mode: opts.mode, prompt_or_output_text_in_receipt: false,
      } };
    },
    async dispose() {},
    ...overrides,
  };
}

test('ES module import and client creation are inert until explicit load', () => {
  let loads = 0;
  const client = createPocketBrainTinyClient({ loadRuntime: async () => { loads++; return fakeRuntime(); } });
  assert.equal(loads, 0);
  assert.equal(client.getStatus().phase, 'idle');
  assert.equal(client.getStatus().ready, false);
  assert.equal(POCKETBRAIN_TINY_SDK_VERSION, '0.1.0-experimental');
});

test('explicit load, progress, model generation, streaming and disposal', async () => {
  const states = [];
  const progress = [];
  const chunks = [];
  let disposed = 0;
  const client = createPocketBrainTinyClient({
    onStateChange(s) { states.push(s.phase); },
    loadRuntime: async (args) => {
      assert.equal(args.preferredDevice, 'webgpu');
      args.onProgress({ status: 'model-initializing' });
      return fakeRuntime({ async dispose() { disposed++; } });
    },
  });
  await assert.rejects(client.generate('hello'), /not ready/);
  const status = await client.load({ preferredDevice: 'webgpu', onProgress: e => progress.push(e.status) });
  assert.equal(status.phase, 'ready');
  assert.equal(status.model, 'test-model');
  assert.deepEqual(progress, ['model-initializing']);
  const { text, receipt } = await client.generate('hello', { mode: 'guarded', onText: s => chunks.push(s) });
  assert.equal(text, 'Generated reply');
  assert.equal(receipt.mode, 'guarded');
  assert.deepEqual(chunks, ['Generated ']);
  assert.equal(client.getStatus().completedRuns, 1);
  await client.dispose();
  assert.equal(disposed, 1);
  assert.equal(client.getStatus().phase, 'disposed');
  await assert.rejects(client.load(), /disposed/);
  await assert.rejects(client.generate('hello'), /not ready/);
  assert.deepEqual(states, ['loading', 'ready', 'generating', 'ready', 'disposed']);
});

test('concurrent loads share one load and cannot dispose mid-load', async () => {
  let count = 0;
  let finish;
  const gate = new Promise(r => { finish = r; });
  const client = createPocketBrainTinyClient({
    loadRuntime: async () => { count++; await gate; return fakeRuntime(); },
  });
  const a = client.load();
  const b = client.load();
  await assert.rejects(client.dispose(), /Cannot dispose during loading/);
  finish();
  await Promise.all([a, b]);
  assert.equal(count, 1);
  assert.equal(client.getStatus().phase, 'ready');
});

test('generation busy lock is enforced and does not change model selection', async () => {
  let finish;
  const gate = new Promise(r => { finish = r; });
  const client = createPocketBrainTinyClient({
    loadRuntime: async () => fakeRuntime({
      async generateWithReceipt() { await gate; return { text: 'result', receipt: { evidence: 'TEST' } }; },
    }),
  });
  await client.load();
  const active = client.generate('one');
  await assert.rejects(client.generate('two'), /not ready/);
  await assert.rejects(client.dispose(), /Cannot dispose during loading or generation/);
  finish();
  await active;
  assert.equal(client.getStatus().phase, 'ready');
  await client.dispose();
});

test('failed loads can retry, invalid models fail closed', async () => {
  let attempts = 0;
  const client = createPocketBrainTinyClient({
    loadRuntime: async () => {
      if (++attempts === 1) throw new Error('Offline');
      return fakeRuntime();
    },
    onStateChange() { throw new Error('Observers must not break lifecycle'); },
  });
  await assert.rejects(client.load(), /Offline/);
  assert.equal(client.getStatus().phase, 'error');
  assert.equal(client.getStatus().error, 'Offline');
  await client.load();
  assert.equal(client.getStatus().phase, 'ready');
  await client.dispose();

  const broken = createPocketBrainTinyClient({loadRuntime: async () => ({ generate: () => 'fake' })});
  await assert.rejects(broken.load(), /does not satisfy the SDK contract/);
});

test('no model bytes bundled; SDK demo requires explicit click', () => {
  const html = readFileSync(new URL('../public/tiny-sdk-demo.html', import.meta.url), 'utf8');
  const demo = readFileSync(new URL('../public/tiny-sdk-demo.mjs', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../public/sdk/v0.1/index.mjs', import.meta.url), 'utf8');
  assert.match(html, /id="sdk-load"/);
  assert.match(demo, /loadButton\.addEventListener\('click'/);
  assert.doesNotMatch(source, /createPocketBrainTiny\(\)/);
  assert.match(source, /getStatus/);
});
