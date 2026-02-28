export const PairingQR = ({ payload }: { payload: string }) => (
  <article className="card">
    <h4>Pairing Payload</h4>
    <p className="helper-text">Copy this payload to your second device (QR rendering can be added without changing protocol).</p>
    <textarea readOnly rows={5} value={payload} />
  </article>
);
