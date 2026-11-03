import { useState, type ChangeEvent } from 'react';
import { inspectCouncilE1, type CouncilPreview } from '../research/councilE1';

const MAX_BYTES = 65536;

/**
 * Local file-selection only. Nothing imported here touches PocketBrain memory,
 * model providers, bridge credentials, network, or cross-device sync.
 */
export const CouncilPage = () => {
  const [preview, setPreview] = useState<CouncilPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const inspect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    // Drop all prior review evidence as soon as a new file is chosen.
    setPreview(null);
    setError('');
    if (!file) return;
    if (file.size < 2 || file.size > MAX_BYTES) {
      setError('Receipt rejected: JSON file must be 2 bytes to 64 KiB.');
      return;
    }
    setBusy(true);
    try {
      const contents = await file.text();
      if (new TextEncoder().encode(contents).length > MAX_BYTES) {
        throw new Error('too large');
      }
      const next = await inspectCouncilE1(JSON.parse(contents) as unknown);
      setPreview(next);
    } catch {
      // Never echo untrusted JSON, filenames, secrets, or parser exception text.
      setError('Receipt rejected: invalid, tampered, or unsupported public synthetic council record.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel settings-panel council-panel" aria-labelledby="council-heading">
      <h2 id="council-heading">Research Council · Observer</h2>
      <p className="helper-text">
        Inspect a manually selected NBGPocketMesh E1 synthetic receipt.
        This is an offline, read-only demonstration, not an active council or scientific verification.
      </p>

      <article className="card">
        <h3>Import public synthetic receipt</h3>
        <label className="settings-field" htmlFor="council-receipt-file">
          <span>E1 JSON receipt (maximum 64 KiB)</span>
          <input
            id="council-receipt-file"
            type="file"
            accept=".json,application/json"
            onChange={(event) => void inspect(event)}
            disabled={busy}
          />
        </label>
        <p className="helper-text">
          Files are parsed in this browser tab only. No upload, sync, memory write,
          model inference, or server request is triggered by this viewer.
          Do not import private records.
        </p>
        <p role="status" aria-live="polite">
          {busy ? 'Inspecting local receipt...' : error ? error :
            preview ? 'Structurally consistent synthetic receipt, held for review.' :
              'No receipt selected.'}
        </p>
      </article>

      {preview && (
        <article className="card" aria-label="Council review result">
          <h3>Review-only · not authenticated</h3>
          <p><strong>Case:</strong> <code>{preview.caseId}</code></p>
          <p><strong>Keyhole distinction:</strong> {preview.distinctionSuggested
            ? 'Subgroup contrast suggested by the E1 action pair'
            : 'No subgroup contrast requested by this E1 action pair'}</p>
          <p className="helper-text">
            A matching digest establishes internal consistency only.
            Source commits are declared, not independently checked.
          </p>
          <h3>Declared Council seats</h3>
          <ul className="memory-list" aria-label="Council roles">
            {preview.seats.map((seat) => (
              <li className="card" key={seat.project}>
                <strong>{seat.project}</strong>
                <span>{seat.role.replaceAll('_', ' ')}</span>
                <span>{seat.action.replaceAll('_', ' ')}</span>
                <small>Declared revision: <code>{seat.sourceSha.slice(0, 12)}</code></small>
              </li>
            ))}
          </ul>
          <p className="helper-text">
            E0 parent digest: <code>{preview.parentDigest.slice(0, 16)}…</code>
          </p>
          <p className="helper-text">
            E1 exchange digest: <code>{preview.exchangeDigest.slice(0, 16)}…</code>
          </p>
          <p className="error-text">
            No verified scientific evidence, authenticated GitHub identity,
            approval, authority, sharing, or model execution.
          </p>
          <button type="button" className="ghost" onClick={() => setPreview(null)}>
            Clear local preview
          </button>
        </article>
      )}
    </section>
  );
};
