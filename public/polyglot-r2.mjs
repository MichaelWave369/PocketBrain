/**
 * Φ Memory Polyglot R2: strict, READ-ONLY PocketBrain envelope validator.
 *
 * This parser establishes structural compatibility only. A JSON file is
 * never an authenticated TMC source, proof of consent, or safe model command.
 * Do not save its text to IndexedDB or add it to a prompt automatically.
 */
export const POLYGLOT_R2_SCHEMA = 'phi.memory.polyglot.consumer.r2';

const KEYS = ['schema', 'reader', 'capsule_id', 'source_sha256', 'evidence_status', 'retention', 'payload'];
const PAYLOAD_KEYS = ['kind', 'text', 'tags', 'truncated'];

function exactRecord(obj, required) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj) &&
    Object.keys(obj).length === required.length &&
    required.every((key) => Object.prototype.hasOwnProperty.call(obj, key));
}

export function parsePolyglotR2(raw) {
  if (typeof raw !== 'string' || raw.length > 16384) {
    throw new Error('Invalid or oversized R2 envelope.');
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new Error('Invalid R2 JSON.');
  }
  if (!exactRecord(obj, KEYS) || !exactRecord(obj.payload, PAYLOAD_KEYS)) {
    throw new Error('Unexpected R2 envelope fields.');
  }
  if (obj.schema !== POLYGLOT_R2_SCHEMA || obj.reader !== 'pocketbrain' ||
      obj.evidence_status !== 'source_claim_not_independently_verified' ||
      obj.retention !== 'ephemeral_preview_only' ||
      typeof obj.capsule_id !== 'string' || !obj.capsule_id || obj.capsule_id.length > 128 ||
      typeof obj.source_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(obj.source_sha256) ||
      obj.payload.kind !== 'compact_context' ||
      typeof obj.payload.text !== 'string' ||
      !obj.payload.text.trim() || obj.payload.text.length > 1024 ||
      typeof obj.payload.truncated !== 'boolean' ||
      !Array.isArray(obj.payload.tags) || obj.payload.tags.length > 8 ||
      !obj.payload.tags.every((tag) => typeof tag === 'string' && tag.length <= 64)) {
    throw new Error('Invalid or misaddressed PocketBrain memory envelope.');
  }
  // Return only whitelisted, copied fields. Do not persist or execute.
  return Object.freeze({
    capsuleId: obj.capsule_id,
    sourceSha256: obj.source_sha256,
    text: obj.payload.text,
    tags: Object.freeze([...obj.payload.tags]),
    truncated: obj.payload.truncated,
    status: 'unverified_external_context'
  });
}
