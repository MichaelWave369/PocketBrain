const ITERATIONS = 150_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (value: Uint8Array): string =>
  btoa(String.fromCharCode(...value));

const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const toArrayBuffer = (value: Uint8Array): ArrayBuffer =>
  value.buffer.slice(
    value.byteOffset,
    value.byteOffset + value.byteLength,
  ) as ArrayBuffer;

const deriveKey = async (
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const encryptJson = async (payload: string, passphrase: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoder.encode(payload)),
  );

  return {
    cipher: 'AES-GCM' as const,
    kdf: 'PBKDF2' as const,
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    payload: toBase64(new Uint8Array(ciphertext)),
  };
};

export const decryptJson = async (
  encrypted: {
    salt: string;
    iv: string;
    payload: string;
    iterations: number;
  },
  passphrase: string,
): Promise<string> => {
  const salt = fromBase64(encrypted.salt);
  const iv = fromBase64(encrypted.iv);
  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(fromBase64(encrypted.payload)),
  );

  return decoder.decode(decrypted);
};
