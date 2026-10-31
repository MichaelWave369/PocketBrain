import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/providers/phiServeProvider.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const { PhiServeProvider } = await import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));
const TOKEN = 'private-token-value';
const MODEL = 'qwen3:4b';
const request = { systemPrompt: 'You are helpful.', context: 'Private memory.', userInput: 'Hi' };

async function configured(endpoint = 'http://127.0.0.1:11435') {
  const provider = new PhiServeProvider();
  await provider.initialize({ settings: {
    type: 'phiserve-bridge', endpointUrl: endpoint, modelName: MODEL,
    apiKey: TOKEN, rememberLocally: false, fallbackToLocalOnFailure: false
  } });
  return provider;
}

function responseFrames(parts) {
  const bytes = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(bytes.encode(part));
      controller.close();
    }
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
}

test('same-device endpoint refuses remote host and URL tricks', async () => {
  for (const endpoint of ['http://192.168.1.20:11435','https://example.com',
    'http://127.0.0.1:11435/api','http://user:pass@localhost:11435']) {
    await assert.rejects(configured(endpoint), /same device|same-device/);
  }
  const provider = await configured();
  assert.equal(provider.isReady(), true);
});

test('nonstreaming calls send authorized Ollama chat, not user data to remote services', async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:11435/api/chat');
      assert.equal(options.headers.Authorization, 'Bearer ' + TOKEN);
      const body = JSON.parse(options.body);
      assert.equal(body.model, MODEL);
      assert.equal(body.stream, false);
      assert.equal(body.messages.at(-1).content, 'Hi');
      assert.match(body.messages[1].content, /Private memory/);
      return Response.json({ done: true, message: { role: 'assistant', content: ' Hello ' } });
    };
    assert.equal(await (await configured()).generate(request), 'Hello');
  } finally {
    globalThis.fetch = old;
  }
});

test('streaming handles split NDJSON, unicode, usage final and proper completion', async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(JSON.parse(options.body).stream, true);
      return responseFrames([
        '{"message":{"content":"Hell"},"done":false}\n{"message":{"content":"',
        'o 🌍"},"done":false}\n',
        '{"message":{"content":""},"done":true,"eval_count":2}\n'
      ]);
    };
    const parts = [];
    for await (const part of (await configured()).generateStream(request)) parts.push(part);
    assert.deepEqual(parts, ['Hell','o 🌍']);
  } finally {
    globalThis.fetch = old;
  }
});

test('truncated stream fails without manufacturing a done event', async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async () => responseFrames(['{"message":{"content":"partial"},"done":false}\n']);
    const iterator = (await configured()).generateStream(request);
    await assert.rejects(async () => {
      for await (const _piece of iterator) { /* consume */ }
    }, /ended before/);
  } finally {
    globalThis.fetch = old;
  }
});

test('server auth errors are surfaced, not treated as a model reply', async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('denied', { status: 401 });
    await assert.rejects((await configured()).generate(request), /Check the local browser-bridge token/);
  } finally {
    globalThis.fetch = old;
  }
});

test('model discovery and connection check include bearer token', async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer ' + TOKEN);
      if (url.endsWith('/health')) return Response.json({status:'ok'});
      if (url.endsWith('/api/tags')) return Response.json({models:[{name:MODEL}]});
      throw Error('Unknown endpoint');
    };
    const provider = await configured();
    assert.deepEqual(await provider.getModelList(), [MODEL]);
    const result = await provider.testConnection();
    assert.equal(result.ok,true);
    assert.match(result.message,/1 registered models/);
  } finally {
    globalThis.fetch = old;
  }
});
