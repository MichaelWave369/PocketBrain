import type { SyncEnvelope } from './types';

export const createWebRtcPeer = async (): Promise<{
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  applyAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  send: (envelope: SyncEnvelope) => void;
}> => {
  const connection = new RTCPeerConnection();
  const channel = connection.createDataChannel('pocketbrain-sync');

  return {
    createOffer: async () => {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      return offer;
    },
    applyAnswer: async (answer) => {
      await connection.setRemoteDescription(answer);
    },
    send: (envelope) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify(envelope));
      }
    }
  };
};
