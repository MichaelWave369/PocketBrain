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
  const [deviceName, setDeviceName] = useState('My Device');
  const [inputPayload, setInputPayload] = useState('');
  const [status, setStatus] = useState('');

  const deviceId = useMemo(() => localStorage.getItem('pocketbrain-device-id') ?? createId(), []);
  localStorage.setItem('pocketbrain-device-id', deviceId);
  const offer = useMemo(() => createPairingOffer(deviceId, deviceName), [deviceId, deviceName]);

  const applyPayload = async () => {
    try {
      const envelope = consumePairingPayload(inputPayload);
      await onTrustDevice({
        id: envelope.deviceId,
        name: envelope.deviceName,
        addedAt: Date.now(),
        lastSyncAt: Date.now()
      });
      setStatus('✅ Trusted device paired. Use Sync now for manual transfer.');
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : 'Invalid pairing payload.');
    }
  };

  return (
    <article className="card">
      <h3>Devices & Sync</h3>
      <p className="helper-text">Bridge sends prompts to models. Sync keeps your PocketBrain data aligned across trusted devices.</p>
      <label className="settings-field">
        <span>This device name</span>
        <input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} />
      </label>

      <PairingQR payload={offer} />

      <label className="settings-field">
        <span>Import pairing payload</span>
        <textarea rows={4} value={inputPayload} onChange={(event) => setInputPayload(event.target.value)} />
      </label>
      <button className="ghost" onClick={() => void applyPayload}>Trust paired device</button>

      <label className="settings-row">
        <span>Auto-sync when trusted peer connected</span>
        <input
          type="checkbox"
          checked={preferences.autoSync}
          onChange={(event) => onPreferencesChange({ ...preferences, autoSync: event.target.checked })}
        />
      </label>

      <p className="helper-text">Manual sync v0.5: metadata-first and explicit. Real-time WebRTC transfer can plug into this protocol.</p>
      <ul className="memory-list compact">
        {trustedDevices.map((device) => (
          <li key={device.id}>
            <strong>{device.name}</strong>
            <span>Last sync: {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : 'never'}</span>
            <button className="ghost danger" onClick={() => void onRevokeDevice(device.id)}>Revoke device</button>
          </li>
        ))}
      </ul>

      {status ? <p className="helper-text">{status}</p> : null}
    </article>
  );
};
