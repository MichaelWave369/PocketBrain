import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePolyglotR2, POLYGLOT_R2_SCHEMA } from '../public/polyglot-r2.mjs';

const fixture = () => ({
  schema: POLYGLOT_R2_SCHEMA,
  reader: 'pocketbrain',
  capsule_id: 'synthetic-demo',
  source_sha256: 'a'.repeat(64),
  evidence_status: 'source_claim_not_independently_verified',
  retention: 'ephemeral_preview_only',
  payload: {
    kind: 'compact_context',
    text: 'Fictional watch-check gesture shows a menu.',
    tags: ['vr', 'synthetic'],
    truncated: false
  }
});

test('accepts bounded synthetic R2 projection as unverified preview only', () => {
  const out = parsePolyglotR2(JSON.stringify(fixture()));
  assert.equal(out.status, 'unverified_external_context');
  assert.equal(out.capsuleId, 'synthetic-demo');
  assert.equal(out.text, fixture().payload.text);
  assert.ok(Object.isFrozen(out));
});

const cases = [
  ['wrong consumer', (x) => { x.reader = 'brainc'; }],
  ['wrong schema', (x) => { x.schema = 'phi.memory.polyglot.consumer.r1'; }],
  ['verified claim', (x) => { x.evidence_status = 'verified'; }],
  ['persist request', (x) => { x.retention = 'persist'; }],
  ['false evidence hash', (x) => { x.source_sha256 = 'bad'; }],
  ['cross-capability field', (x) => { x.token = 'not-allowed'; }],
  ['payload injection', (x) => { x.payload.execute = true; }],
  ['long memory text', (x) => { x.payload.text = 'X'.repeat(1025); }],
  ['empty memory text', (x) => { x.payload.text = '   '; }],
  ['too many tags', (x) => { x.payload.tags = Array(9).fill('test'); }],
  ['oversized tag', (x) => { x.payload.tags = ['x'.repeat(65)]; }],
  ['fake truncation', (x) => { x.payload.truncated = 'false'; }],
  ['bad capsule id', (x) => { x.capsule_id = ''; }],
  ['wrong view kind', (x) => { x.payload.kind = 'semantic_context'; }]
];
for (const [name, mutate] of cases) {
  test('rejects ' + name, () => {
    const value = fixture();
    mutate(value);
    assert.throws(() => parsePolyglotR2(JSON.stringify(value)));
  });
}
test('rejects oversized JSON and malformed files', () => {
  assert.throws(() => parsePolyglotR2('a'.repeat(16385)));
  assert.throws(() => parsePolyglotR2('{'));
  assert.throws(() => parsePolyglotR2(null));
});

test('parser does not execute embedded markup or persist it', () => {
  const value = fixture();
  value.payload.text = '<img src=x onerror=alert(1)>';
  const out = parsePolyglotR2(JSON.stringify(value));
  assert.equal(out.text, value.payload.text);
  assert.equal(typeof out.tags[0], 'string');
});
