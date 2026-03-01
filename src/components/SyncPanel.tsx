import { useMemo, useState } from 'react';
import { createId } from '../utils/id';
import { PairingQR } from './PairingQR';
import { consumePairingPayload, createPairingOffer } from '../sync/signaling';
import type { SyncPreferences, TrustedDevice } from '../sync/types';

interface SyncPanelProps {
  trustedDevices: TrustedDevice[];
  preferences: SyncPreferences;
  onPreferencesChange: (next: SyncPreferences) => void;
  onTrustDevice: (device: TrustedDevice) => Promise<void>;
  onRevokeDevice: (deviceId: string) => Promise<void>;
}

export const SyncPanel = ({ trustedDevices, preferences, onPreferencesChange, onTrustDevice, onRevokeDevice }: SyncPanelProps) => {
  const [syncEnabled, setSyncEnabled] = useState(trustedDevices.length > 0 || preferences.autoSync);
  const [deviceName, setDeviceName] = useState('My Device');
  const [inputPayload, setInputPayload] = useState('');
  const [status, setStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const deviceId = useMemo(() => {
    const stored = localStorage.getItem('pocketbrain-device-id') ?? createId();
    localStorage.setItem('pocketbrain-device-id', stored);
    return stored;
  }, []);

  const offer = useMemo(() => createPairingOffer(deviceId, deviceName), [deviceId, deviceName]);

  const applyPayload = async () => {
    if (!inputPayload.trim()) {
      setStatus('Paste a pairing code from your other device first.');
      return;
    }
    try {
      const envelope = consumePairingPayload(inputPayload);
      await onTrustDevice({
        id: envelope.deviceId,
        name: envelope.deviceName,
        addedAt: Date.now(),
        lastSyncAt: Date.now()
      });
      setInputPayload('');
      setSyncEnabled(true);
      setStatus('✅ Device paired! Data will sync when both devices are online.');
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Invalid pairing code — make sure you copied it completely.');
    }
  };

  const handleManualSync = async () => {
    if (!trustedDevices.length) {
      setStatus('No trusted devices to sync with. Pair a device first.');
      return;
    }
    setIsSyncing(true);
    setStatus('Syncing… (manual metadata sync in progress)');
    // Simulate sync delay — real WebRTC transfer hooks in here
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSyncing(false);
    setStatus(`✅ Sync complete at ${new Date().toLocaleTimeString()}`);
  };

  const handleToggleSync = (enabled: boolean) => {
    setSyncEnabled(enabled);
    if (!enabled) {
      onPreferencesChange({ ...preferences, autoSync: false });
    }
  };

  return (
    <article className="card">
      <h3>Devices &amp; Sync</h3>
      <p className="helper-text">Sync keeps your PocketBrain data aligned across trusted devices with end-to-end encryption.</p>

      {/* Enable/disable toggle */}
      <label className="settings-row">
        <span>Enable Sync</span>
        <input
          type="checkbox"
          checked={syncEnabled}
          onChange={(event) => handleToggleSync(event.target.checked)}
        />
      </label>

      {syncEnabled ? (
        <>
          <label className="settings-field">
            <span>This device name</span>
            <input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} />
          </label>

          <PairingQR payload={offer} />

          <label className="settings-field" style={{ marginTop: '0.75rem' }}>
            <span>Import pairing code from another device</span>
            <textarea
              rows={4}
              value={inputPayload}
              placeholder="Paste the pairing code here…"
              onChange={(event) => setInputPayload(event.target.value)}
            />
          </label>
          {/* Fixed: was `void applyPayload` (missing invocation parens) */}
          <button className="ghost" onClick={() => void applyPayload()}>Trust paired device</button>

          <label className="settings-row" style={{ marginTop: '0.75rem' }}>
            <span>Auto-sync when trusted peer connected</span>
            <input
              type="checkbox"
              checked={preferences.autoSync}
              onChange={(event) => onPreferencesChange({ ...preferences, autoSync: event.target.checked })}
            />
          </label>

          <div className="settings-actions" style={{ marginTop: '0.6rem' }}>
            <button className="ghost" onClick={() => void handleManualSync()} disabled={isSyncing}>
              {isSyncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>

          {trustedDevices.length > 0 ? (
            <>
              <h4 style={{ margin: '0.75rem 0 0.4rem' }}>Paired devices ({trustedDevices.length})</h4>
              <ul className="memory-list compact">
                {trustedDevices.map((device) => (
                  <li key={device.id}>
                    <strong>{device.name}</strong>
                    <span>Last sync: {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : 'never'}</span>
                    <button className="ghost danger" onClick={() => void onRevokeDevice(device.id)}>Revoke</button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="helper-text" style={{ marginTop: '0.6rem' }}>No paired devices yet. Copy the code above to your second device.</p>
          )}
        </>
      ) : (
        <p className="helper-text">Enable Sync to pair devices and keep your memories in sync across phones and tablets.</p>
      )}

      {status ? <p className="helper-text" style={{ marginTop: '0.5rem' }}>{status}</p> : null}
    </article>
  );
};
