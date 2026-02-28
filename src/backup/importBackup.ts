import { decryptJson } from './crypto';
import type { BackupData, BackupPackage, EncryptedBackupEnvelope } from './types';

export const parseBackupFile = async (file: File): Promise<BackupPackage> => {
  const raw = await file.text();
  return JSON.parse(raw) as BackupPackage;
};

export const isEncryptedPackage = (backupPackage: BackupPackage): backupPackage is EncryptedBackupEnvelope =>
  (backupPackage as EncryptedBackupEnvelope).encrypted === true;

export const unpackBackupData = async (backupPackage: BackupPackage, passphrase?: string): Promise<BackupData> => {
  if (!isEncryptedPackage(backupPackage)) {
    return backupPackage as BackupData;
  }

  if (!passphrase) {
    throw new Error('Passphrase required for encrypted backup import.');
  }

  const raw = await decryptJson(backupPackage, passphrase);
  const parsed = JSON.parse(raw) as BackupData;
  if (!parsed.version || !parsed.createdAt) {
    throw new Error('Invalid decrypted backup structure.');
  }
  return parsed;
};
