import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const tsSource = readFileSync(new URL('../src/research/councilE1.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(tsSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }
}).outputText;
const { inspectCouncilE1, COUNCIL_SCHEMA: SCHEMA } =
  await import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));

const seats = [
  ['ThinkTank','MichaelWave369/think-tank','HYPOTHESIS_CHALLENGER','HYPOTHESIS_ONLY','CHALLENGE_AGGREGATE_EQUIVALENCE'],
  ['PocketBrain','MichaelWave369/PocketBrain','LOCAL_OBSERVER','DISPLAY_ONLY','DISPLAY_K0_K1_CONTRAST'],
  ['Vessie','MichaelWave369/SuperPhiVessel','GOVERNANCE_REVIEWER','REVIEW_ONLY','HOLD_FOR_OPERATOR_REVIEW']
];
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}
const sha = object => createHash('sha256').update(canonical(object)).digest('hex');
function fixture(witness = true) {
  const parent = sha({ simulatedE0: true });
  const receipts = seats.map(([participant, repository, role, claimTier, action]) => {
    const base = {
      schema: SCHEMA, caseId: 'council-case-synthetic-01', participant,
      repository, sourceSha: 'a'.repeat(40),
      sourceIdentity: 'DECLARED_UNVERIFIED', role, claimTier,
      action: !witness && participant === 'ThinkTank' ? 'REVIEW_E0_RESULT' :
        !witness && participant === 'PocketBrain' ? 'DISPLAY_E0_RESULT' : action,
      parentE0Sha256: parent,
      origin: 'SIMULATED', privacy: 'PUBLIC_SYNTHETIC', authority: 'NONE',
      modelExecuted: false, operatorApproved: false, evidenceAuthenticated: false,
      transportPerformed: false,
      interpretation: 'Synthetic contract output; no scientific corroboration'
    };
    return { ...base, receiptSha256: sha(base) };
  });
  const base = {
    schema: SCHEMA, policyEpoch: 1, caseId: 'council-case-synthetic-01',
    e0Schema: 'nbg-pocketmesh.council-keyhole-e0.v0.1',
    e0ReceiptSha256: parent, origin: 'SIMULATED',
    privacy: 'PUBLIC_SYNTHETIC', authority: 'NONE',
    state: 'HELD_FOR_OPERATOR_REVIEW',
    sourceProvenance: 'DECLARED_UNVERIFIED', independentEvidence: false,
    executionAuthorized: false, mergeAuthorized: false,
    sharingAuthorized: false, externalCalls: 0, receipts
  };
  return { ...base, exchangeSha256: sha(base) };
}
function resign(value) {
  for (const receipt of value.receipts) {
    const { receiptSha256: ignored, ...unsigned } = receipt;
    receipt.receiptSha256 = sha(unsigned);
  }
  const { exchangeSha256: ignored, ...outer } = value;
  value.exchangeSha256 = sha(outer);
  return value;
}
test('renders preview fields only, never grants source, science, or action authority', async () => {
  const result = await inspectCouncilE1(fixture());
  assert.equal(result.disposition, 'HELD_UNTRUSTED_REVIEW_ONLY');
  assert.equal(result.seats.length, 3);
  assert.equal(result.distinctionSuggested, true);
  for (const key of ['sourceAuthenticated','verifiedScience','executionAuthorized','sharingAuthorized']) {
    assert.equal(result[key], false);
  }
  assert.equal(JSON.stringify(result).includes('operatorApproved'), false);
});
test('null E0 witness maps to non-challenge display, still held', async () => {
  const result = await inspectCouncilE1(fixture(false));
  assert.equal(result.distinctionSuggested, false);
  assert.equal(result.disposition, 'HELD_UNTRUSTED_REVIEW_ONLY');
});
test('changing a seat digest or outer digest is refused', async () => {
  const seat = fixture();
  seat.receipts[0].sourceSha = 'b'.repeat(40);
  await assert.rejects(inspectCouncilE1(seat), /COUNCIL_RECEIPT_DIGEST/);
  const outer = fixture();
  outer.exchangeSha256 = 'f'.repeat(64);
  await assert.rejects(inspectCouncilE1(outer), /COUNCIL_EXCHANGE_DIGEST/);
});
test('forged authority and evidence tiers fail even with recomputed hashes', async () => {
  for (const [key, value] of [
    ['executionAuthorized', true], ['mergeAuthorized', true],
    ['sharingAuthorized', true], ['independentEvidence', true],
    ['sourceProvenance','VERIFIED'],['origin','MEASURED'],
    ['privacy','PRIVATE'],['authority','HUMAN'],['externalCalls',1]
  ]) {
    const f = fixture();
    f[key] = value;
    await assert.rejects(inspectCouncilE1(resign(f)), /COUNCIL_TRUST_BOUNDARY/, key);
  }
});
test('forged seat authority and symbolic/scientific promotion fail with recomputed hashes', async () => {
  for (const [key, value] of [
    ['participant', 'GAIA'], ['claimTier', 'PHYSICAL_EVIDENCE'],
    ['role', 'EXECUTOR'], ['sourceIdentity', 'GITHUB_VERIFIED'],
    ['modelExecuted', true], ['operatorApproved', true],
    ['evidenceAuthenticated', true], ['transportPerformed', true]
  ]) {
    const f = fixture(); f.receipts[0][key] = value;
    await assert.rejects(inspectCouncilE1(resign(f)), /COUNCIL_SEAT_TRUST/, key);
  }
});
test('unknown, duplicate, reordered or extra seats rejected', async () => {
  const missing = fixture();
  missing.receipts.pop();
  await assert.rejects(inspectCouncilE1(resign(missing)), /COUNCIL_SEAT_COUNT/);
  const extra = fixture();
  extra.receipts.push(structuredClone(extra.receipts[0]));
  await assert.rejects(inspectCouncilE1(resign(extra)), /COUNCIL_SEAT_COUNT/);
  const reorder = fixture();
  reorder.receipts.reverse();
  await assert.rejects(inspectCouncilE1(resign(reorder)), /COUNCIL_SEAT_TRUST/);
});
test('invalid source SHA and mismatching E0 lineage refused', async () => {
  const badSha = fixture();
  badSha.receipts[0].sourceSha = 'ABCDEF';
  await assert.rejects(inspectCouncilE1(resign(badSha)), /COUNCIL_SOURCE_SHA/);
  const parent = fixture();
  parent.receipts[0].parentE0Sha256 = 'f'.repeat(64);
  await assert.rejects(inspectCouncilE1(resign(parent)), /COUNCIL_SEAT_TRUST/);
});
test('mismatched action pair cannot reclassify witness', async () => {
  const f = fixture();
  f.receipts[1].action = 'DISPLAY_E0_RESULT';
  await assert.rejects(inspectCouncilE1(resign(f)), /COUNCIL_ACTION_PAIR/);
});
test('any raw prompts, extra fields, or memory payloads are refused', async () => {
  const one = fixture();
  one.memory = { message: 'secret' };
  await assert.rejects(inspectCouncilE1(resign(one)), /COUNCIL_TOP_SCHEMA/);
  const two = fixture();
  two.receipts[0].prompt = 'secret';
  await assert.rejects(inspectCouncilE1(resign(two)), /COUNCIL_SEAT_SCHEMA/);
});
test('self-consistent fabricated bundle is never independently attested', async () => {
  const f = fixture();
  f.receipts.forEach(receipt => { receipt.sourceSha = 'b'.repeat(40); });
  const result = await inspectCouncilE1(resign(f));
  assert.equal(result.sourceAuthenticated, false);
  assert.equal(result.verifiedScience, false);
});
test('invalid schema, plain-object boundary and unsupported epoch fail closed', async () => {
  await assert.rejects(inspectCouncilE1(null), /COUNCIL_TOP_SCHEMA/);
  await assert.rejects(inspectCouncilE1([]), /COUNCIL_TOP_SCHEMA/);
  const f = fixture();
  f.policyEpoch = 2;
  await assert.rejects(inspectCouncilE1(resign(f)), /COUNCIL_TRUST_BOUNDARY/);
});
test('contract emits a safely bounded categorical preview, not raw receipt', async () => {
  const result = await inspectCouncilE1(fixture());
  assert.deepEqual(result.seats.map(seat => seat.project), ['ThinkTank','PocketBrain','Vessie']);
  assert.deepEqual(result.seats.map(seat => seat.sourceSha), Array(3).fill('a'.repeat(40)));
  assert.match(result.parentDigest, /^[a-f0-9]{64}$/);
  assert.match(result.exchangeDigest, /^[a-f0-9]{64}$/);
});
