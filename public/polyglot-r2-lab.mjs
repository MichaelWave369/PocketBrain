import { parsePolyglotR2 } from './polyglot-r2.mjs';

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

document.querySelector('#clear').addEventListener('click', reset);
fileInput.addEventListener('change', async () => {
  preview.hidden = true;
  const file = fileInput.files?.[0];
  if (!file) return reset();
  if (file.size > 16384) {
    status.textContent = 'File rejected: too large for an R2 preview.';
    return;
  }
  try {
    const parsed = parsePolyglotR2(await file.text());
    // Display only through textContent; never innerHTML, storage or prompts.
    document.getElementById('capsule').textContent = parsed.capsuleId;
    document.getElementById('hash').textContent = parsed.sourceSha256;
    document.getElementById('tags').textContent = parsed.tags.join(', ') || '(none)';
    document.getElementById('truncated').textContent = parsed.truncated ? 'yes' : 'no';
    document.getElementById('memory').textContent = parsed.text;
    status.textContent = 'Synthetic preview parsed. Authenticity and consent not verified.';
    preview.hidden = false;
  } catch {
    status.textContent = 'File rejected: malformed or not addressed to PocketBrain.';
  }
});
