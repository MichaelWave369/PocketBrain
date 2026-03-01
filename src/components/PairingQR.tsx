import { useState } from 'react';

interface PairingQRProps {
  payload: string;
}

export const PairingQR = ({ payload }: PairingQRProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the textarea text for manual copy
      const el = document.querySelector<HTMLTextAreaElement>('.pairing-payload-text');
      el?.select();
    }
  };

  const sharePayload = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: 'PocketBrain Pairing Code', text: payload });
    } catch {
      // User cancelled share or not supported
    }
  };

  return (
    <article className="card pairing-code-card">
      <h4>Pairing Code</h4>
      <ol className="pairing-steps">
        <li>Tap <strong>Copy Code</strong> below on this device.</li>
        <li>On your second device go to <strong>Settings → Devices &amp; Sync</strong>.</li>
        <li>Paste into <em>Import pairing code</em> and tap <strong>Trust device</strong>.</li>
      </ol>
      <textarea readOnly rows={4} value={payload} className="pairing-payload-text" />
      <div className="settings-actions">
        <button className="ghost" onClick={() => void copyToClipboard()}>
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>
        {typeof navigator.share === 'function' ? (
          <button className="ghost" onClick={() => void sharePayload()}>Share…</button>
        ) : null}
      </div>
    </article>
  );
};
