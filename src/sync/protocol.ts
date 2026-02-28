import type { SyncEnvelope, SyncPayloadType } from './types';

export const createEnvelope = <T>(
  payloadType: SyncPayloadType,
  payload: T,
  options: { deviceId: string; deviceName: string; appVersion: string }
): SyncEnvelope<T> => ({
  protocolVersion: 1,
  deviceId: options.deviceId,
  deviceName: options.deviceName,
  appVersion: options.appVersion,
  timestamp: new Date().toISOString(),
  payloadType,
  payload,
  encryption: { algorithm: 'DTLS-SRTP/WebRTC' }
});

export const encodeEnvelope = (envelope: SyncEnvelope): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(envelope))));

export const decodeEnvelope = (encoded: string): SyncEnvelope =>
  JSON.parse(decodeURIComponent(escape(atob(encoded.trim())))) as SyncEnvelope;
