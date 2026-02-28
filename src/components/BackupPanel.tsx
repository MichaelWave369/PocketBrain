import { useMemo, useState } from 'react';
import { createBackupPackage, downloadBackupPackage } from '../backup/exportBackup';
import { parseBackupFile, unpackBackupData, isEncryptedPackage } from '../backup/importBackup';
import { summarizeBackup, type BackupData, type ImportMode } from '../backup/types';

interface BackupPanelProps {
  onExportData: (options: { includeVoiceBlobs: boolean; includeImageBlobs: boolean; metadataOnly: boolean }) => Promise<BackupData>;
  onImportData: (data: BackupData, mode: ImportMode) => Promise<void>;
  onClearData: (scope: 'chats' | 'summaries' | 'voice' | 'images' | 'bridges' | 'all') => Promise<void>;
}

export const BackupPanel = ({ onExportData, onImportData, onClearData }: BackupPanelProps) => {
  const [encryptExport, setEncryptExport] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [typedConfirm, setTypedConfirm] = useState('');
  const [includeVoiceBlobs, setIncludeVoiceBlobs] = useState(true);
  const [includeImageBlobs, setIncludeImageBlobs] = useState(true);

  const preview = useMemo(() => (importPreview ? summarizeBackup(importPreview) : null), [importPreview]);

  const runExport = async () => {
    setStatus('Preparing export...');
    const metadataOnly = !includeVoiceBlobs && !includeImageBlobs;
    const data = await onExportData({ includeVoiceBlobs, includeImageBlobs, metadataOnly });

    if (encryptExport) {
      if (!passphrase || passphrase !== confirmPassphrase) {
        setStatus('❌ Passphrase mismatch.');
        return;
      }
    }

    const backupPackage = await createBackupPackage(data, {
      encrypted: encryptExport,
      includeVoiceBlobs,
      includeImageBlobs,
      metadataOnly,
      passphrase: encryptExport ? passphrase : undefined
    });
    downloadBackupPackage(backupPackage, encryptExport);
    setStatus(encryptExport ? '✅ Encrypted backup exported.' : '✅ Plain backup exported.');
  };

  const loadImportPreview = async (file: File) => {
    const backupPackage = await parseBackupFile(file);
    if (isEncryptedPackage(backupPackage)) {
      setStatus('Encrypted backup detected. Enter passphrase to preview/import.');
      setImportPreview(null);
    } else {
      setImportPreview(backupPackage);
      setStatus('Backup parsed. Review summary and import mode.');
    }
    setImportFile(file);
  };

  const runImport = async () => {
    if (!importFile) {
      setStatus('❌ Select a backup file first.');
      return;
    }

    const backupPackage = await parseBackupFile(importFile);
    const data = await unpackBackupData(backupPackage, importPassphrase || undefined);
    setImportPreview(data);
    await onImportData(data, importMode);
    setStatus(`✅ Backup imported (${importMode}).`);
  };

  const clearScope = async (scope: 'chats' | 'summaries' | 'voice' | 'images' | 'bridges' | 'all') => {
    if (scope === 'all' && typedConfirm !== 'DELETE') {
      setStatus('Type DELETE to clear all local data.');
      return;
    }

    await onClearData(scope);
    setStatus(`✅ Cleared ${scope}.`);
  };

  return (
    <article className="card">
      <h3>Backups & Data Management</h3>
      <p className="helper-text">Lose your encrypted passphrase and recovery is impossible.</p>

      <div className="backup-grid">
        <label className="settings-row">
          <span>Encrypted export</span>
          <input type="checkbox" checked={encryptExport} onChange={(event) => setEncryptExport(event.target.checked)} />
        </label>

        {encryptExport ? (
          <>
            <input
              type="password"
              placeholder="Export passphrase"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm passphrase"
              value={confirmPassphrase}
              onChange={(event) => setConfirmPassphrase(event.target.value)}
            />
          </>
        ) : null}

        <label className="settings-row">
          <span>Include voice blobs</span>
          <input type="checkbox" checked={includeVoiceBlobs} onChange={(event) => setIncludeVoiceBlobs(event.target.checked)} />
        </label>
        <label className="settings-row">
          <span>Include image blobs</span>
          <input type="checkbox" checked={includeImageBlobs} onChange={(event) => setIncludeImageBlobs(event.target.checked)} />
        </label>

        <button className="ghost" onClick={() => void runExport()}>
          {encryptExport ? 'Export Encrypted Backup' : 'Export Plain Backup'}
        </button>
      </div>

      <hr />

      <div className="backup-grid">
        <input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && void loadImportPreview(event.target.files[0])} />
        <input
          type="password"
          placeholder="Import passphrase (if encrypted)"
          value={importPassphrase}
          onChange={(event) => setImportPassphrase(event.target.value)}
        />

        <label className="settings-row">
          <span>Import mode</span>
          <select value={importMode} onChange={(event) => setImportMode(event.target.value as ImportMode)}>
            <option value="merge">Merge import</option>
            <option value="replace">Replace local data</option>
          </select>
        </label>

        {preview ? (
          <p className="helper-text">
            Preview: {preview.messageCount} messages, {preview.summaryCount} summaries, {preview.voiceNoteCount} voice
            notes, {preview.imageCount} image memories, settings: {preview.settingsIncluded ? 'yes' : 'no'}, created {preview.createdAt}.
          </p>
        ) : null}

        <button className="ghost" onClick={() => void runImport()}>
          Import Backup
        </button>
      </div>

      <hr />

      <div className="settings-actions">
        <button className="ghost" onClick={() => void clearScope('chats')}>Clear chats</button>
        <button className="ghost" onClick={() => void clearScope('summaries')}>Clear summaries</button>
        <button className="ghost" onClick={() => void clearScope('voice')}>Clear voice notes</button>
        <button className="ghost" onClick={() => void clearScope('images')}>Clear image memories</button>
        <button className="ghost" onClick={() => void clearScope('bridges')}>Clear bridge settings</button>
      </div>
      <input
        placeholder="Type DELETE to clear all local data"
        value={typedConfirm}
        onChange={(event) => setTypedConfirm(event.target.value)}
      />
      <button className="ghost danger" onClick={() => void clearScope('all')}>Clear all local data</button>

      {status ? <p className="helper-text">{status}</p> : null}
    </article>
  );
};
