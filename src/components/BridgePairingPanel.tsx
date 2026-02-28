import { useMemo, useState } from 'react';
import { buildKnownHostProbeList, probeKnownHosts } from '../bridge/discovery';
import {
  createPairingPayload,
  decodePairingPayload,
  encodePairingPayload,
  exportPairingFile,
  importPairingFile
} from '../bridge/pairing';
import type { AppSettings } from '../types';

interface BridgePairingPanelProps {
  settings: AppSettings;
  onApplyPairing: (next: Partial<AppSettings>) => void;
  lastSuccessfulBridge: string | null;
}

export const BridgePairingPanel = ({ settings, onApplyPairing, lastSuccessfulBridge }: BridgePairingPanelProps) => {
  const [encodedPairing, setEncodedPairing] = useState('');
  const [probeResultText, setProbeResultText] = useState('');

  const currentPayload = useMemo(
    () =>
      createPairingPayload({
        providerType: settings.providerType,
        baseUrl: settings.bridgeEndpointUrl,
        modelName: settings.bridgeModelName,
        displayName: 'PocketBrain Trusted Bridge'
      }),
    [settings.providerType, settings.bridgeEndpointUrl, settings.bridgeModelName]
  );

  const pairingCode = encodePairingPayload(currentPayload);

  const handleImportFile = async (file: File) => {
    const payload = await importPairingFile(file);
    onApplyPairing({
      providerType: payload.providerType,
      bridgeEndpointUrl: payload.baseUrl,
      bridgeModelName: payload.modelName
    });
  };

  const handleApplyCode = () => {
    const payload = decodePairingPayload(encodedPairing);
    onApplyPairing({
      providerType: payload.providerType,
      bridgeEndpointUrl: payload.baseUrl,
      bridgeModelName: payload.modelName
    });
  };

  const handleProbe = async () => {
    const hosts = buildKnownHostProbeList(lastSuccessfulBridge, settings.bridgeEndpointUrl);
    const results = await probeKnownHosts(hosts);
    setProbeResultText(
      results
        .map((result) => `${result.ok ? '✅' : '❌'} ${result.endpoint}: ${result.message}`)
        .join('\n')
    );
  };

  return (
    <article className="card">
      <h3>Pair a trusted bridge</h3>
      <p className="helper-text">Pairing-first discovery avoids blind network scans.</p>

      <div className="settings-actions">
        <button className="ghost" onClick={() => exportPairingFile(currentPayload)}>
          Export pairing file
        </button>
        <button className="ghost" onClick={() => navigator.clipboard.writeText(pairingCode)}>
          Copy pairing QR payload
        </button>
      </div>

      <label className="settings-field">
        <span>Import pairing file</span>
        <input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && void handleImportFile(event.target.files[0])} />
      </label>

      <label className="settings-field">
        <span>Paste QR payload</span>
        <textarea value={encodedPairing} onChange={(event) => setEncodedPairing(event.target.value)} rows={3} />
      </label>
      <button className="ghost" onClick={handleApplyCode}>
        Apply pairing payload
      </button>

      <div className="settings-actions">
        <button className="ghost" onClick={() => void handleProbe()}>
          Probe known hosts
        </button>
      </div>

      {probeResultText ? <pre className="probe-results">{probeResultText}</pre> : null}
    </article>
  );
};
