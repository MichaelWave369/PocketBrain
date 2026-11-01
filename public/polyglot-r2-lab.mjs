import { parsePolyglotR2, POLYGLOT_R2_SCHEMA } from './polyglot-r2.mjs';

const fileInput = document.querySelector('#file');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');

const reset = () => {
  fileInput.value = '';
  preview.hidden = true;
  for (const id of ['capsule', 'hash', 'tags', 'truncated', 'memory']) {
    document.getElementById(id).textContent = '';
  }
  status.textContent = 'No file loaded.';
};

const show = (parsed, message) => {
  // Display only through textContent; never innerHTML, storage or prompts.
  document.getElementById('capsule').textContent = parsed.capsuleId;
  document.getElementById('hash').textContent = parsed.sourceSha256;
  document.getElementById('tags').textContent = parsed.tags.join(', ') || '(none)';
  document.getElementById('truncated').textContent = parsed.truncated ? 'yes' : 'no';
  document.getElementById('memory').textContent = parsed.text;
  status.textContent = message;
  preview.hidden = false;
};

document.querySelector('#clear').addEventListener('click', reset);
document.querySelector('#demo').addEventListener('click', () => {
  const fake = {
    schema: POLYGLOT_R2_SCHEMA,
    reader: 'pocketbrain',
    capsule_id: 'synthetic-demo-only',
    source_sha256: '0'.repeat(64), // deliberate placeholder, NOT real provenance
    evidence_status: 'source_claim_not_independently_verified',
    retention: 'ephemeral_preview_only',
    payload: {
      kind: 'compact_context',
      text: 'Fictional requirement: turn your wrist like a watch to view the VR menu.',
      tags: ['synthetic', 'vr'],
      truncated: false
    }
  };
  fileInput.value = '';
  show(parsePolyglotR2(JSON.stringify(fake)), 'Demo only. SHA-256 is a placeholder; no real memory or source proof.');
});

fileInput.addEventListener('change', async () => {
  preview.hidden = true;
  const file = fileInput.files?.[0];
  if (!file) return reset();
  if (file.size > 16384) {
    status.textContent = 'File rejected: too large for an R2 preview.';
    return;
  }
  try {
    show(parsePolyglotR2(await file.text()),
      'Synthetic preview parsed. Authenticity and consent not verified.');
  } catch {
    status.textContent = 'File rejected: malformed or not addressed to PocketBrain.';
  }
});
