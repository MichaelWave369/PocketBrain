import { openPocketBrainCourier, COURIER_SCHEMA } from './polyglot-r3.mjs';

const $ = (id) => document.getElementById(id);
const encoder = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function clear() {
  $('package').value = '';
  $('signer').value = '';
  $('passphrase').value = '';
  $('pin-confirm').checked = false;
  $('preview').hidden = true;
  $('memory').textContent = '';
  $('status').textContent = 'No courier opened.';
}

function show(view, note) {
  // No innerHTML, storage, import into chat, or network access.
  $('memory').textContent = JSON.stringify({
    capsule: view.capsuleId,
    unverifiedStatus: view.status,
    summary: view.text,
    tags: view.tags,
    truncated: view.truncated,
  }, null, 2);
  $('preview').hidden = false;
  $('status').textContent = note;
}

async function syntheticDemo() {
  // Demonstrates the wire protocol, not a TMC-approved source or actual identity.
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
  );
  const pkBytes = await crypto.subtle.exportKey('spki', pair.publicKey);
  const publicPem = '-----BEGIN PUBLIC KEY-----\n' +
    btoa(String.fromCharCode(...new Uint8Array(pkBytes))) +
    '\n-----END PUBLIC KEY-----\n';
  const passphrase = 'synthetic-demo-phrase-not-secret';
  const now = Math.floor(Date.now() / 1000);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const header = {
    schema: COURIER_SCHEMA, reader: 'pocketbrain',
    issued_at: now, expires_at: now + 120,
    salt: b64(salt), iv: b64(iv), ciphertext: ''
  };
  const r2 = {
    schema: 'phi.memory.polyglot.consumer.r2',
    reader: 'pocketbrain', capsule_id: 'synthetic-browser-demo',
    source_sha256: '0'.repeat(64), // clearly not real TMC provenance
    evidence_status: 'source_claim_not_independently_verified',
    retention: 'ephemeral_preview_only',
    payload: {
      kind: 'compact_context',
      text: 'Fictional watch-check gesture opens a VR menu.',
      tags: ['synthetic', 'demo'], truncated: false
    }
  };
  const secret = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  const aes = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    secret, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const aad = encoder.encode(
    ['schema', 'reader', 'issued_at', 'expires_at'].map((k) => String(header[k])).join('\n')
  );
  header.ciphertext = b64(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
    aes, encoder.encode(JSON.stringify(r2))
  ));
  const toSign = encoder.encode(
    ['schema', 'reader', 'issued_at', 'expires_at', 'salt', 'iv', 'ciphertext']
      .map((k) => String(header[k])).join('\n')
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, toSign
  );
  const packageJson = JSON.stringify({ ...header, signature: b64(signature) });
  return openPocketBrainCourier(packageJson, {
    trustedSignerPublicPem: publicPem, passphrase, now
  });
}

$('clear').addEventListener('click', clear);
$('demo').addEventListener('click', async () => {
  clear();
  $('status').textContent = 'Running locally...';
  try {
    show(await syntheticDemo(),
      'Synthetic self-signed demonstration complete. NOT an authenticated TMC source.');
  } catch {
    $('status').textContent = 'Synthetic demonstration failed in this browser.';
  }
});
$('open').addEventListener('click', async () => {
  $('preview').hidden = true;
  $('memory').textContent = '';
  if (!$('pin-confirm').checked) {
    $('status').textContent = 'Verify the signer public key independently first.';
    return;
  }
  const pkg = $('package').files?.[0];
  const signer = $('signer').files?.[0];
  if (!pkg || !signer || pkg.size > 32768 || signer.size > 2048) {
    $('status').textContent = 'Select a small synthetic courier and trusted public PEM.';
    return;
  }
  try {
    const view = await openPocketBrainCourier(await pkg.text(), {
      trustedSignerPublicPem: await signer.text(),
      passphrase: $('passphrase').value
    });
    show(view, 'Signer matched supplied pin; content remains unverified.');
  } catch {
    $('status').textContent = 'Courier rejected: invalid, untrusted or expired.';
  } finally {
    $('passphrase').value = '';
  }
});
