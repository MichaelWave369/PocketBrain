import type { ChangeEvent } from 'react';
import type { AppSettings, DeviceDiagnostics } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  modelOptions: string[];
  diagnostics: DeviceDiagnostics;
  onSettingsChange: (next: AppSettings) => void;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onResetModel: () => Promise<void>;
}

export const SettingsPage = ({
  settings,
  modelOptions,
  diagnostics,
  onSettingsChange,
  onExport,
  onImport,
  onResetModel
}: SettingsPageProps) => {
  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await onImport(file);
    event.target.value = '';
  };

  return (
    <section className="panel">
      <h2>Settings</h2>

      <article className="card">
        <label className="settings-row">
          <span>Local-only mode</span>
          <input
            type="checkbox"
            checked={settings.localOnlyMode}
            onChange={(event) => onSettingsChange({ ...settings, localOnlyMode: event.target.checked })}
          />
        </label>
      </article>

      <article className="card">
        <label className="settings-field">
          <span>Phone-safe model selection</span>
          <select
            value={settings.selectedModel}
            onChange={(event) => onSettingsChange({ ...settings, selectedModel: event.target.value })}
          >
            {modelOptions.map((modelId) => (
              <option key={modelId} value={modelId}>
                {modelId}
              </option>
            ))}
          </select>
        </label>
      </article>

      <article className="card">
        <label className="settings-row">
          <span>Use Web Worker (recommended)</span>
          <input
            type="checkbox"
            checked={settings.useWebWorker}
            onChange={(event) => onSettingsChange({ ...settings, useWebWorker: event.target.checked })}
          />
        </label>

        <label className="settings-row">
          <span>Use IndexedDB cache for model artifacts</span>
          <input
            type="checkbox"
            checked={settings.useIndexedDbCache}
            onChange={(event) => onSettingsChange({ ...settings, useIndexedDbCache: event.target.checked })}
          />
        </label>
      </article>

      <article className="card">
        <h3>Device diagnostics</h3>
        <ul className="diagnostics-list">
          <li>
            <strong>GPU vendor</strong>
            <span>{diagnostics.gpuVendor}</span>
          </li>
          <li>
            <strong>Max storage buffer binding size</strong>
            <span>{diagnostics.maxStorageBufferBindingSize}</span>
          </li>
          <li>
            <strong>User agent</strong>
            <span>{diagnostics.userAgent}</span>
          </li>
        </ul>
      </article>

      <article className="card settings-actions">
        <button className="ghost" onClick={() => void onExport()}>
          Export memory
        </button>
        <label className="ghost import-button">
          Import memory
          <input type="file" accept="application/json" onChange={(event) => void handleImportChange(event)} />
        </label>
        <button className="ghost" onClick={() => void onResetModel()}>
          Reset model runtime
        </button>
      </article>
    </section>
  );
};
