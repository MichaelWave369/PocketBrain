import type { ProviderType } from '../providers/types';

export interface PairingPayload {
  version: 1;
  providerType: ProviderType;
  baseUrl: string;
  modelName: string;
  apiPath?: string;
  displayName?: string;
  createdAt: string;
}

export const createPairingPayload = (input: Omit<PairingPayload, 'version' | 'createdAt'>): PairingPayload => ({
  version: 1,
  createdAt: new Date().toISOString(),
  ...input
});

export const encodePairingPayload = (payload: PairingPayload): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

export const decodePairingPayload = (encoded: string): PairingPayload => {
  const decoded = decodeURIComponent(escape(atob(encoded.trim())));
  const parsed = JSON.parse(decoded) as PairingPayload;
  if (parsed.version !== 1 || !parsed.baseUrl) {
    throw new Error('Invalid pairing payload.');
  }
  return parsed;
};

export const exportPairingFile = (payload: PairingPayload): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pocketbrain-bridge-pairing.json';
  link.click();
  URL.revokeObjectURL(url);
};

export const importPairingFile = async (file: File): Promise<PairingPayload> => {
  const raw = await file.text();
  const parsed = JSON.parse(raw) as PairingPayload;
  if (parsed.version !== 1) {
    throw new Error('Unsupported pairing file version.');
  }
  return parsed;
};
