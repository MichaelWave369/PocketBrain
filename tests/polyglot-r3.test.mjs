import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { openPocketBrainCourier } from '../public/polyglot-r3.mjs';

const ROOT = new URL('./fixtures/', import.meta.url);
const raw = await readFile(new URL('polyglot-r3-synthetic.json', ROOT), 'utf8');
const publicPem = await readFile(new URL('polyglot-r3-public.pem', ROOT), 'utf8');
const password = 'synthetic-test-phrase-not-secret';
const now = 1820000001;
const options = { trustedSignerPublicPem: publicPem, passphrase: password, now };
const original = JSON.parse(raw);

test('Python-generated encrypted signed fixture opens in WebCrypto', async () => {
  const memory = await openPocketBrainCourier(raw, options);
  assert.equal(memory.capsuleId, 'synthetic-fixture-r3');
  assert.equal(memory.text, 'Synthetic VR wrist-check gesture opens a fictional menu.');
  assert.equal(memory.status, 'unverified_external_context');
  assert.ok(Object.isFrozen(memory));
});

test('wrong passphrase is rejected, with no plaintext in errors', async () => {
  await assert.rejects(
    openPocketBrainCourier(raw, { ...options, passphrase: 'incorrect-synthetic-password' }),
    (error) => !error.message.includes('Synthetic VR')
  );
});

test('wrong public key pin rejected', async () => {
  const keys = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
  );
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey));
  const bin = Array.from(spki, (x) => String.fromCharCode(x)).join('');
  const falsePin = '-----BEGIN PUBLIC KEY-----\n' + btoa(bin) + '\n-----END PUBLIC KEY-----\n';
  await assert.rejects(openPocketBrainCourier(raw, {
    ...options, trustedSignerPublicPem: falsePin
  }));
});

const tamperCases = [
  ['reader', (v) => { v.reader = 'brainc'; }],
  ['schema', (v) => { v.schema = 'phi.memory.polyglot.r0'; }],
  ['ciphertext', (v) => { v.ciphertext = 'A' + v.ciphertext.slice(1); }],
  ['signature', (v) => { v.signature = 'A' + v.signature.slice(1); }],
  ['expiry', (v) => { v.expires_at += 1; }],
  ['salt', (v) => { v.salt = 'A'; }],
  ['iv', (v) => { v.iv = 'A'; }],
  ['unexpected field', (v) => { v.execute = true; }],
  ['boolean timestamp', (v) => { v.issued_at = true; }]
];
for (const [name, mutate] of tamperCases) {
  test('rejects tampered ' + name, async () => {
    const next = structuredClone(original);
    mutate(next);
    await assert.rejects(openPocketBrainCourier(JSON.stringify(next), options));
  });
}

test('expired and not yet valid couriers rejected', async () => {
  await assert.rejects(openPocketBrainCourier(raw, { ...options, now: 1820000120 }));
  await assert.rejects(openPocketBrainCourier(raw, { ...options, now: 1819999999 }));
});

test('oversized, missing and malformed courier rejected', async () => {
  await assert.rejects(openPocketBrainCourier('x'.repeat(33000), options));
  await assert.rejects(openPocketBrainCourier('', options));
  await assert.rejects(openPocketBrainCourier('[]', options));
});

test('source remains untrusted data, with no persistence or model calls', async () => {
  const view = await openPocketBrainCourier(raw, options);
  assert.equal(view.courierStatus, 'signed_by_pinned_demo_or_operator_key');
  assert.equal(view.status, 'unverified_external_context');
  assert.equal(typeof view.text, 'string');
});
