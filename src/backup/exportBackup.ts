import { encryptJson } from './crypto';
import type { BackupData, BackupExportOptions, BackupPackage, EncryptedBackupEnvelope } from './types';

export const createBackupPackage = async (data: BackupData, options: BackupExportOptions): Promise<BackupPackage> => {
  const normalized: BackupData = {
    ...data,
    voiceNotes: options.metadataOnly ? data.voiceNotes.map((note) => ({ ...note, base64Audio: undefined })) : data.voiceNotes,
    imageMemories: options.metadataOnly
      ? data.imageMemories.map((image) => ({ ...image, base64Image: undefined }))
      : data.imageMemories
  };

  if (!options.encrypted) {
    return normalized;
  }

  if (!options.passphrase) {
    throw new Error('Passphrase is required for encrypted export.');
  }

  const encrypted = await encryptJson(JSON.stringify(normalized), options.passphrase);
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
