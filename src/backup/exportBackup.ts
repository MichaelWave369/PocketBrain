import type { BackupData, BackupPackage, EncryptedBackupEnvelope } from './types';
import { encryptJson } from './crypto';

export const createBackupPackage = async (
  data: BackupData,
  options: { encrypted: boolean; passphrase?: string }
): Promise<BackupPackage> => {
  if (!options.encrypted) {
    return data;
  }

  if (!options.passphrase) {
    throw new Error('Passphrase is required for encrypted export.');
  }

  const encrypted = await encryptJson(JSON.stringify(data), options.passphrase);
  const envelope: EncryptedBackupEnvelope = {
    version: 1,
    encrypted: true,
    createdAt: data.createdAt,
    appVersion: data.appVersion,
    ...encrypted
  };

  return envelope;
};

export const downloadBackupPackage = (backupPackage: BackupPackage, encrypted: boolean) => {
  const fileName = encrypted ? 'pocketbrain-backup.pocketbrain.enc.json' : 'pocketbrain-backup.pocketbrain.json';
  const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
