import { useState, type ChangeEvent } from 'react';
import { BridgePairingPanel } from '../components/BridgePairingPanel';
import { BackupPanel } from '../components/BackupPanel';
import type { BackupData, ImportMode } from '../backup/types';
import type { AppSettings, DeviceDiagnostics } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  modelOptions: string[];
  providerOptions: Array<{ value: AppSettings['providerType']; label: string }>;
  diagnostics: DeviceDiagnostics;
  trustedBridgeEndpoints: string[];
  onSettingsChange: (next: AppSettings) => void;
  onResetModel: () => Promise<void>;
  onTestBridgeConnection: () => Promise<{ ok: boolean; message: string }>;
  onApplyPairing: (patch: Partial<AppSettings>) => void;
  onExportData: () => Promise<BackupData>;
  onImportData: (data: BackupData, mode: ImportMode) => Promise<void>;
  onClearData: (scope: 'chats' | 'summaries' | 'voice' | 'bridges' | 'all') => Promise<void>;
}

export const SettingsPage = ({
  settings,
  modelOptions,
  providerOptions,
  diagnostics,
  trustedBridgeEndpoints,
  onSettingsChange,
  onResetModel,
  onTestBridgeConnection,
  onApplyPairing,
  onExportData,
  onImportData,
  onClearData
}: SettingsPageProps) => {
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const isBridgeProvider = settings.providerType !== 'local-webllm';

  const bridgePlaceholder =
    settings.providerType === 'ollama-bridge' ? 'http://192.168.x.x:11434' : 'http://192.168.x.x:8000/v1';

  const handleConnectionTest = async () => {
    const result = await onTestBridgeConnection();
    setConnectionStatus(`${result.ok ? '✅' : '❌'} ${result.message}`);
  };

  return (
    <section className="panel settings-panel">
      <h2>Settings</h2>

      <article className="card">
        <p className="helper-text">
          Small phone, big brain: PocketBrain keeps memory local and can optionally borrow a stronger model over your
          network.
        </p>
      </article>

      <article className="card">
        <label className="settings-row">
          <span>Provider</span>
          <select
            value={settings.providerType}
            onChange={(event) => onSettingsChange({ ...settings, providerType: event.target.value as AppSettings['providerType'] })}
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </article>

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
          <span>Local model selection</span>
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

      {isBridgeProvider ? (
        <>
          <article className="card">
            <label className="settings-field">
              <span>Bridge endpoint URL</span>
              <input
                placeholder={bridgePlaceholder}
                value={settings.bridgeEndpointUrl}
                onChange={(event) => onSettingsChange({ ...settings, bridgeEndpointUrl: event.target.value })}
              />
            </label>

            <label className="settings-field">
              <span>Bridge model name</span>
              <input
                placeholder={settings.providerType === 'ollama-bridge' ? 'llama3.2:3b' : 'gpt-4o-mini'}
                value={settings.bridgeModelName}
                onChange={(event) => onSettingsChange({ ...settings, bridgeModelName: event.target.value })}
              />
            </label>

            <label className="settings-field">
              <span>API key (optional)</span>
              <input
                type="password"
                placeholder="sk-..."
                value={settings.bridgeApiKey}
                onChange={(event) => onSettingsChange({ ...settings, bridgeApiKey: event.target.value })}
              />
            </label>

            <label className="settings-row">
              <span>Remember this bridge</span>
              <input
                type="checkbox"
                checked={settings.rememberBridgeSettings}
                onChange={(event) => onSettingsChange({ ...settings, rememberBridgeSettings: event.target.checked })}
              />
            </label>

            <label className="settings-row">
              <span>Use bridge only when local model unavailable</span>
              <input
                type="checkbox"
                checked={settings.bridgeFallbackToLocal}
                onChange={(event) => onSettingsChange({ ...settings, bridgeFallbackToLocal: event.target.checked })}
              />
            </label>

            <div className="settings-actions">
              <button className="ghost" onClick={() => void handleConnectionTest()}>
                Test Bridge Connection
              </button>
              {trustedBridgeEndpoints[0] ? (
                <button
                  className="ghost"
                  onClick={() =>
                    onApplyPairing({
                      bridgeEndpointUrl: trustedBridgeEndpoints[0]
                    })
                  }
                >
                  Reconnect recent endpoint
                </button>
              ) : null}
            </div>

            {connectionStatus ? <p className="helper-text">{connectionStatus}</p> : null}
            <p className="helper-text">
              Pairing-first discovery: no blind subnet scanning. Probe runs only after you explicitly tap it.
            </p>
          </article>

          <BridgePairingPanel
            settings={settings}
            onApplyPairing={onApplyPairing}
            lastSuccessfulBridge={trustedBridgeEndpoints[0] ?? null}
          />
        </>
      ) : null}

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

      <article className="card privacy-callout">
        <strong>Privacy notice</strong>
        <p>
          Local mode is fully on-device. Bridge mode sends prompts only to the endpoint you configure. PocketBrain does
          not add hidden telemetry.
        </p>
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

      <BackupPanel onExportData={onExportData} onImportData={onImportData} onClearData={onClearData} />

      <article className="card settings-actions">
        <button className="ghost" onClick={() => void onResetModel()}>
          Reset model runtime
        </button>
      </article>
    </section>
  );
};
