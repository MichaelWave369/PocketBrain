/**
 * Φ Memory Polyglot R3 offline courier verifier for PocketBrain.
 *
 * This is NOT a network client or a source of verified factual truth.
 * A trusted TMC signer public key MUST be pinned out of band. The signed
 * ciphertext can be copied/replayed after decryption; no live revocation.
 * A valid package remains unverified memory content, not an instruction.
 */
import { parsePolyglotR2 } from './polyglot-r2.mjs';

export const COURIER_SCHEMA = 'phi.memory.polyglot.courier.r3';
const HEADER_KEYS = [
  'schema', 'reader', 'issued_at', 'expires_at',
  'salt', 'iv', 'ciphertext', 'signature'
];
const SIGNED_KEYS = HEADER_KEYS.slice(0, 7);
const AAD_KEYS = HEADER_KEYS.slice(0, 4);

const exact = (value, keys) => value !== null &&
  typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));

function decodeBase64url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid courier encoding.');
  }
  const raw = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(raw + '='.repeat((4 - raw.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const canonical = btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (canonical !== value) throw new Error('Noncanonical courier encoding.');
  return bytes;
}

const encoder = new TextEncoder();
const message = (obj, keys) => encoder.encode(keys.map((key) => String(obj[key])).join('\n'));

const getPemBytes = (pem) => {
  if (typeof pem !== 'string' || pem.length > 2048) throw new Error('Missing signer pin.');
  const match = /^-----BEGIN PUBLIC KEY-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END PUBLIC KEY-----\s*$/.exec(pem);
  if (!match) throw new Error('Invalid signer pin.');
  const clean = match[1].replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) throw new Error('Invalid signer pin.');
  return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
};

export async function openPocketBrainCourier(raw, { trustedSignerPublicPem, passphrase, now } = {}) {
  try {
    if (typeof raw !== 'string' || encoder.encode(raw).length > 32768) {
      throw new Error('Oversized courier.');
    }
    const packet = JSON.parse(raw);
    if (!exact(packet, HEADER_KEYS) ||
        packet.schema !== COURIER_SCHEMA || packet.reader !== 'pocketbrain') {
      throw new Error('Unexpected courier recipient or schema.');
    }
    const timestamp = now === undefined ? Math.floor(Date.now() / 1000) : now;
    if (!Number.isSafeInteger(packet.issued_at) || !Number.isSafeInteger(packet.expires_at) ||
        !Number.isSafeInteger(timestamp) || packet.issued_at > timestamp ||
        packet.expires_at <= timestamp ||
        packet.expires_at - packet.issued_at < 1 ||
        packet.expires_at - packet.issued_at > 300) {
      throw new Error('Courier lifetime invalid.');
    }
    if (typeof passphrase !== 'string' || passphrase.length < 16 ||
        passphrase.length > 1024 || /[\x00-\x1f]/.test(passphrase)) {
      throw new Error('Invalid passphrase.');
    }

    const salt = decodeBase64url(packet.salt);
    const iv = decodeBase64url(packet.iv);
    const cipher = decodeBase64url(packet.ciphertext);
    const sig = decodeBase64url(packet.signature);
    if (salt.length !== 16 || iv.length !== 12 || sig.length !== 64 ||
        cipher.length < 16 || cipher.length > 16384) {
      throw new Error('Unexpected courier lengths.');
    }
    const publicKey = await crypto.subtle.importKey(
      'spki', getPemBytes(trustedSignerPublicPem),
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    // Verify trusted signer BEFORE running the password KDF.
    const signed = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, publicKey, sig, message(packet, SIGNED_KEYS)
    );
    if (!signed) throw new Error('Signer signature mismatch.');
    const material = await crypto.subtle.importKey(
      'raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    const aes = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: message(packet, AAD_KEYS),
        tagLength: 128 }, aes, cipher
    );
    if (plaintext.byteLength > 16384) throw new Error('Oversized decrypted view.');
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
    // Reuse R2's strict reader-specific data parser. No automatic persistence.
    const preview = parsePolyglotR2(decoded);
    return Object.freeze({ ...preview, courierStatus: 'signed_by_pinned_demo_or_operator_key' });
  } catch {
    // Do not leak whether a passphrase, pin, signature or envelope was wrong.
    throw new Error('Courier rejected: invalid, untrusted or expired package.');
  }
}
