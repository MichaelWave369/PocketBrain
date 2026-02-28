export type SyncPayloadType =
  | 'handshake-offer'
  | 'handshake-answer'
  | 'ping'
  | 'sync-preview'
  | 'sync-delta'
  | 'sync-complete'
  | 'error';

export interface SyncEnvelope<T = unknown> {
  protocolVersion: 1;
  deviceId: string;
  deviceName: string;
  appVersion: string;
  timestamp: string;
  payloadType: SyncPayloadType;
  payload: T;
  encryption?: { algorithm: 'DTLS-SRTP/WebRTC' | 'none' };
}

export interface TrustedDevice {
  id: string;
  name: string;
  addedAt: number;
  lastSyncAt?: number;
}

export interface SyncPreferences {
  autoSync: boolean;
  categories: Array<'chats' | 'summaries' | 'pinned' | 'bridges' | 'settings' | 'voice' | 'images'>;
}
