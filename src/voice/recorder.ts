export interface RecordingSession {
  stop: () => Promise<{ blob: Blob; durationMs: number; mimeType: string }>;
  cancel: () => void;
}

export const canRecordAudio = () => 'mediaDevices' in navigator && typeof MediaRecorder !== 'undefined';

export const startRecording = async (): Promise<RecordingSession> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  const startedAt = Date.now();

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.start();

  const cleanup = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  return {
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onstop = () => {
          const durationMs = Date.now() - startedAt;
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(chunks, { type: mimeType });
          cleanup();
          resolve({ blob, durationMs, mimeType });
        };
        recorder.onerror = () => {
          cleanup();
          reject(new Error('Unable to complete recording.'));
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.stop();
      cleanup();
    }
  };
};
