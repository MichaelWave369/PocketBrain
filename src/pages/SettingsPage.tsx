import { useState } from 'react';
import { BridgePairingPanel } from '../components/BridgePairingPanel';
import { BackupPanel } from '../components/BackupPanel';
import { SyncPanel } from '../components/SyncPanel';
import { TTSControls } from '../components/TTSControls';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import type { BackupData, ImportMode } from '../backup/types';
import type { SyncPreferences, TrustedDevice } from '../sync/types';
import type { AppSettings, DeviceDiagnostics } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  modelOptions: string[];
  providerOptions: Array<{ value: AppSettings['providerType']; label: string }>;
  diagnostics: DeviceDiagnostics;
  trustedBridgeEndpoints: string[];
  trustedDevices: TrustedDevice[];
  syncPreferences: SyncPreferences;
  onSyncPreferencesChange: (next: SyncPreferences) => void;
  onSettingsChange: (next: AppSettings) => void;
  onResetModel: () => Promise<void>;
  onTestBridgeConnection: () => Promise<{ ok: boolean; message: string }>;
  onApplyPairing: (patch: Partial<AppSettings>) => void;
  onExportData: (options: { includeVoiceBlobs: boolean; includeImageBlobs: boolean; metadataOnly: boolean }) => Promise<BackupData>;
  onImportData: (data: BackupData, mode: ImportMode) => Promise<void>;
  onClearData: (scope: 'chats' | 'summaries' | 'voice' | 'images' | 'bridges' | 'all') => Promise<void>;
  onTrustDevice: (device: TrustedDevice) => Promise<void>;
  onRevokeDevice: (deviceId: string) => Promise<void>;
  onDescribeImageWithBridge: (imageBlob: Blob) => Promise<string>;
  onRefreshModelList: () => Promise<void>;
}

export const SettingsPage = ({
  settings,
  modelOptions,
  providerOptions,
  diagnostics,
  trustedBridgeEndpoints,
  trustedDevices,
  syncPreferences,
  onSyncPreferencesChange,
  onSettingsChange,
  onResetModel,
  onTestBridgeConnection,
  onApplyPairing,
  onExportData,
  onImportData,
  onClearData,
  onTrustDevice,
  onRevokeDevice,
  onDescribeImageWithBridge,
  onRefreshModelList
}: SettingsPageProps) => {
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [visionStatus, setVisionStatus] = useState('');
  const tts = useSpeechSynthesis({
    enabled: settings.ttsEnabled,
    autoReadReplies: settings.ttsAutoReadReplies,
    voiceURI: settings.ttsVoiceURI,
    rate: settings.ttsRate,
    pitch: settings.ttsPitch,
    volume: settings.ttsVolume
  });

  const isBridgeProvider = settings.providerType !== 'local-webllm';
  const bridgePlaceholder = settings.providerType === 'ollama-bridge' ? 'http://192.168.x.x:11434' : 'http://192.168.x.x:8000/v1';

  const handleConnectionTest = async () => {
    const result = await onTestBridgeConnection();
    setConnectionStatus(`${result.ok ? '✅' : '❌'} ${result.message}`);
  };

  return (
    <section className="panel settings-panel">
      <h2>Settings</h2>

      <article className="card">
        <p className="helper-text">Bridge sends prompts to stronger models. Sync shares your PocketBrain data across trusted devices.</p>
      </article>

      <article className="card">
        <label className="settings-row">
          <span>Provider</span>
          <select value={settings.providerType} onChange={(event) => onSettingsChange({ ...settings, providerType: event.target.value as AppSettings['providerType'] })}>
            {providerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </article>

      <article className="card">
        <label className="settings-row">
          <span>Local model selection</span>
          <select value={settings.selectedModel} onChange={(event) => onSettingsChange({ ...settings, selectedModel: event.target.value })}>
            {modelOptions.map((modelId) => <option key={modelId} value={modelId}>{modelId}</option>)}
          </select>
        </label>
        <div className="settings-actions" style={{ marginTop: '0.5rem' }}>
          <button className="ghost" onClick={() => void onRefreshModelList()}>Refresh model list</button>
        </div>
      </article>

      {isBridgeProvider ? (
        <article className="card">
          <label className="settings-field">
            <span>Bridge endpoint URL</span>
            <input placeholder={bridgePlaceholder} value={settings.bridgeEndpointUrl} onChange={(event) => onSettingsChange({ ...settings, bridgeEndpointUrl: event.target.value })} />
          </label>
          <label className="settings-field">
            <span>Bridge model name</span>
            <input value={settings.bridgeModelName} onChange={(event) => onSettingsChange({ ...settings, bridgeModelName: event.target.value })} />
          </label>
          <label className="settings-field">
            <span>API key (optional)</span>
            <input type="password" value={settings.bridgeApiKey} onChange={(event) => onSettingsChange({ ...settings, bridgeApiKey: event.target.value })} />
          </label>
          <div className="settings-actions">
            <button className="ghost" onClick={() => void handleConnectionTest()}>Test Bridge Connection</button>
            {trustedBridgeEndpoints[0] ? <button className="ghost" onClick={() => onApplyPairing({ bridgeEndpointUrl: trustedBridgeEndpoints[0] })}>Reconnect recent endpoint</button> : null}
          </div>
          {connectionStatus ? <p className="helper-text">{connectionStatus}</p> : null}
        </article>
      ) : null}

      {isBridgeProvider ? <BridgePairingPanel settings={settings} onApplyPairing={onApplyPairing} lastSuccessfulBridge={trustedBridgeEndpoints[0] ?? null} /> : null}

      <TTSControls
        settings={{
          enabled: settings.ttsEnabled,
          autoReadReplies: settings.ttsAutoReadReplies,
          voiceURI: settings.ttsVoiceURI,
          rate: settings.ttsRate,
          pitch: settings.ttsPitch,
          volume: settings.ttsVolume
        }}
        voices={tts.voices}
        state={tts.statusLabel}
        onChange={(next) =>
          onSettingsChange({
            ...settings,
            ttsEnabled: next.enabled,
            ttsAutoReadReplies: next.autoReadReplies,
            ttsVoiceURI: next.voiceURI,
            ttsRate: next.rate,
            ttsPitch: next.pitch,
            ttsVolume: next.volume
          })
        }
        onPause={tts.pause}
        onResume={tts.resume}
        onStop={tts.stop}
      />

      <article className="card">
        <h3>Capture preferences</h3>
        <label className="settings-row">
          <span>Image compression preference</span>
          <select value={settings.imageCompressionPreference} onChange={(event) => onSettingsChange({ ...settings, imageCompressionPreference: event.target.value as AppSettings['imageCompressionPreference'] })}>
            <option value="original">Original quality</option>
            <option value="balanced">Balanced size</option>
          </select>
        </label>
        <label className="settings-row">
          <span>Confirm before bridge image analysis</span>
          <input type="checkbox" checked={settings.confirmBeforeBridgeImageAnalysis} onChange={(event) => onSettingsChange({ ...settings, confirmBeforeBridgeImageAnalysis: event.target.checked })} />
        </label>
        <button className="ghost" onClick={() => void onDescribeImageWithBridge(new Blob(['test'], { type: 'text/plain' })).then((msg) => setVisionStatus(msg)).catch((err) => setVisionStatus(err instanceof Error ? err.message : 'Bridge analysis unavailable'))}>Test bridge image analysis contract</button>
        {visionStatus ? <p className="helper-text">{visionStatus}</p> : null}
      </article>

      <SyncPanel trustedDevices={trustedDevices} preferences={syncPreferences} onPreferencesChange={onSyncPreferencesChange} onTrustDevice={onTrustDevice} onRevokeDevice={onRevokeDevice} />

      <article className="card">
        <h3>Privacy</h3>
        <p className="helper-text">Local-first defaults are preserved. Bridge and sync are explicit opt-in actions only.</p>
      </article>

      <article className="card">
        <h3>Device diagnostics</h3>
        <ul className="diagnostics-list">
          <li><strong>GPU vendor</strong><span>{diagnostics.gpuVendor}</span></li>
          <li><strong>Max storage buffer binding size</strong><span>{diagnostics.maxStorageBufferBindingSize}</span></li>
          <li><strong>User agent</strong><span>{diagnostics.userAgent}</span></li>
        </ul>
      </article>

      <BackupPanel onExportData={onExportData} onImportData={onImportData} onClearData={onClearData} />

      <article className="card settings-actions">
        <button className="ghost" onClick={() => void onResetModel()}>Reset model runtime</button>
      </article>
    </section>
  );
};
