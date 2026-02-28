import type { ChangeEvent } from 'react';
import type { AppSettings } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsChange: (next: AppSettings) => void;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
}

export const SettingsPage = ({ settings, onSettingsChange, onExport, onImport }: SettingsPageProps) => {
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
          <span>Model selection (placeholder)</span>
          <select
            value={settings.selectedModel}
            onChange={(event) => onSettingsChange({ ...settings, selectedModel: event.target.value })}
          >
            <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama 3.2 1B Instruct (default)</option>
            <option value="Qwen2.5-1.5B-Instruct-q4f16_1-MLC">Qwen 2.5 1.5B (placeholder)</option>
          </select>
        </label>
      </article>

      <article className="card settings-actions">
        <button className="ghost" onClick={() => void onExport()}>
          Export memory
        </button>
        <label className="ghost import-button">
          Import memory
          <input type="file" accept="application/json" onChange={(event) => void handleImportChange(event)} />
        </label>
      </article>
    </section>
  );
};
