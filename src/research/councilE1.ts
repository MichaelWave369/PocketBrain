/**
 * PocketBrain's independent, browser-only consumer for the fixed NBG E1 envelope.
 * This never imports another app, probes GitHub, executes a model, or stores data.
 * SHA-256 checks establish internal consistency, NOT source authenticity.
 */
export const COUNCIL_SCHEMA = 'nbg-pocketmesh.council-evidence-exchange-e1.v0.1';

const SEATS = [
  {
    participant: 'ThinkTank',
    repository: 'MichaelWave369/think-tank',
    role: 'HYPOTHESIS_CHALLENGER',
    claimTier: 'HYPOTHESIS_ONLY',
    actions: ['CHALLENGE_AGGREGATE_EQUIVALENCE', 'REVIEW_E0_RESULT']
  },
  {
    participant: 'PocketBrain',
    repository: 'MichaelWave369/PocketBrain',
    role: 'LOCAL_OBSERVER',
    claimTier: 'DISPLAY_ONLY',
    actions: ['DISPLAY_K0_K1_CONTRAST', 'DISPLAY_E0_RESULT']
  },
  {
    participant: 'Vessie',
    repository: 'MichaelWave369/SuperPhiVessel',
    role: 'GOVERNANCE_REVIEWER',
    claimTier: 'REVIEW_ONLY',
    actions: ['HOLD_FOR_OPERATOR_REVIEW']
  }
] as const;

const TOP = ['schema', 'policyEpoch', 'caseId', 'e0Schema', 'e0ReceiptSha256',
  'origin', 'privacy', 'authority', 'state', 'sourceProvenance', 'independentEvidence',
  'executionAuthorized', 'mergeAuthorized', 'sharingAuthorized', 'externalCalls',
  'receipts', 'exchangeSha256'];
const INNER = ['schema', 'caseId', 'participant', 'repository', 'sourceSha',
  'sourceIdentity', 'role', 'claimTier', 'action', 'parentE0Sha256', 'origin',
  'privacy', 'authority', 'modelExecuted', 'operatorApproved', 'evidenceAuthenticated',
  'transportPerformed', 'interpretation', 'receiptSha256'];
const SHA256 = /^[a-f0-9]{64}$/;
const SHA40 = /^[a-f0-9]{40}$/;
const CASE_ID = /^[A-Za-z0-9._:-]{1,64}$/;
const INTERPRETATION = 'Synthetic contract output; no scientific corroboration';

type Plain = Record<string, unknown>;
export type CouncilPreview = Readonly<{
  caseId: string;
  parentDigest: string;
  exchangeDigest: string;
  distinctionSuggested: boolean;
  seats: ReadonlyArray<Readonly<{
    project: string;
    role: string;
    action: string;
    sourceSha: string;
  }>>;
  disposition: 'HELD_UNTRUSTED_REVIEW_ONLY';
  sourceAuthenticated: false;
  verifiedScience: false;
  executionAuthorized: false;
  sharingAuthorized: false;
}>;

function requireFlag(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}

function isPlain(value: unknown): value is Plain {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function exact(value: unknown, fields: string[], reason: string): asserts value is Plain {
  requireFlag(isPlain(value), reason);
  requireFlag(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort()), reason);
}

function same(record: Plain, expectations: Record<string, unknown>, reason: string) {
  for (const [key, expected] of Object.entries(expectations)) {
    requireFlag(record[key] === expected, reason);
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ':' + canonical((value as Plain)[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

async function digestOf(value: Plain): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  const result = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(result), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyDigest(record: Plain, key: string, reason: string) {
  const value = record[key];
  requireFlag(typeof value === 'string' && SHA256.test(value), reason);
  const unsigned = Object.fromEntries(Object.entries(record).filter(([field]) => field !== key));
  requireFlag(await digestOf(unsigned) === value, reason);
}

/** Explicit user-selected public synthetic JSON only. No network, storage, or LLM. */
export async function inspectCouncilE1(value: unknown): Promise<CouncilPreview> {
  exact(value, TOP, 'COUNCIL_TOP_SCHEMA');
  same(value, {
    schema: COUNCIL_SCHEMA,
    policyEpoch: 1,
    e0Schema: 'nbg-pocketmesh.council-keyhole-e0.v0.1',
    origin: 'SIMULATED',
    privacy: 'PUBLIC_SYNTHETIC',
    authority: 'NONE',
    state: 'HELD_FOR_OPERATOR_REVIEW',
    sourceProvenance: 'DECLARED_UNVERIFIED',
    independentEvidence: false,
    executionAuthorized: false,
    mergeAuthorized: false,
    sharingAuthorized: false,
    externalCalls: 0
  }, 'COUNCIL_TRUST_BOUNDARY');
  requireFlag(typeof value.caseId === 'string' && CASE_ID.test(value.caseId), 'COUNCIL_CASE_ID');
  requireFlag(typeof value.e0ReceiptSha256 === 'string' &&
    SHA256.test(value.e0ReceiptSha256), 'COUNCIL_PARENT_DIGEST');
  requireFlag(Array.isArray(value.receipts) && value.receipts.length === SEATS.length,
    'COUNCIL_SEAT_COUNT');

  const actions: string[] = [];
  const previewSeats: Array<{project: string; role: string; action: string; sourceSha: string}> = [];
  for (let index = 0; index < SEATS.length; index++) {
    const seat = SEATS[index];
    const receipt: unknown = value.receipts[index];
    exact(receipt, INNER, 'COUNCIL_SEAT_SCHEMA');
    same(receipt, {
      schema: COUNCIL_SCHEMA,
      caseId: value.caseId,
      participant: seat.participant,
      repository: seat.repository,
      role: seat.role,
      claimTier: seat.claimTier,
      sourceIdentity: 'DECLARED_UNVERIFIED',
      parentE0Sha256: value.e0ReceiptSha256,
      origin: 'SIMULATED',
      privacy: 'PUBLIC_SYNTHETIC',
      authority: 'NONE',
      modelExecuted: false,
      operatorApproved: false,
      evidenceAuthenticated: false,
      transportPerformed: false,
      interpretation: INTERPRETATION
    }, 'COUNCIL_SEAT_TRUST');
    requireFlag(typeof receipt.sourceSha === 'string' &&
      SHA40.test(receipt.sourceSha), 'COUNCIL_SOURCE_SHA');
    requireFlag(typeof receipt.action === 'string' &&
      (seat.actions as readonly string[]).includes(receipt.action), 'COUNCIL_ACTION');
    await verifyDigest(receipt, 'receiptSha256', 'COUNCIL_RECEIPT_DIGEST');
    actions.push(receipt.action);
    previewSeats.push({
      project: seat.participant,
      role: seat.role,
      action: receipt.action,
      sourceSha: receipt.sourceSha
    });
  }
  const witness = actions[0] === 'CHALLENGE_AGGREGATE_EQUIVALENCE';
  requireFlag(actions[1] === (witness ? 'DISPLAY_K0_K1_CONTRAST' : 'DISPLAY_E0_RESULT'),
    'COUNCIL_ACTION_PAIR');
  await verifyDigest(value, 'exchangeSha256', 'COUNCIL_EXCHANGE_DIGEST');

  // Output contains only bounded identifiers and categorical actions. No raw input echo.
  return Object.freeze({
    caseId: value.caseId,
    parentDigest: value.e0ReceiptSha256 as string,
    exchangeDigest: value.exchangeSha256 as string,
    distinctionSuggested: witness,
    seats: previewSeats.map(x => Object.freeze(x)),
    disposition: 'HELD_UNTRUSTED_REVIEW_ONLY',
    sourceAuthenticated: false,
    verifiedScience: false,
    executionAuthorized: false,
    sharingAuthorized: false
  });
}
