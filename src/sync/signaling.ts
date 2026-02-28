import { createEnvelope, decodeEnvelope, encodeEnvelope } from './protocol';

export const createPairingOffer = (deviceId: string, deviceName: string): string =>
  encodeEnvelope(
    createEnvelope(
      'handshake-offer',
      { note: 'Manual pairing exchange for v0.5 baseline. WebRTC answer flow can plug in here.' },
      { deviceId, deviceName, appVersion: '0.5.0' }
    )
  );

export const consumePairingPayload = (encoded: string) => decodeEnvelope(encoded);
