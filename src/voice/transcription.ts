interface SpeechRecognitionAlternativeLike {
  transcript?: string;
}

interface SpeechRecognitionResultLike {
  0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  results: Array<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getSpeechCtor = (): SpeechRecognitionCtor | null => {
  const globalWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition ?? null;
};

export const isBrowserTranscriptionSupported = (): boolean => Boolean(getSpeechCtor());

export const transcribeWithBrowserSpeech = async (): Promise<string> => {
  const Ctor = getSpeechCtor();
  if (!Ctor) {
    throw new Error('Speech recognition is unavailable.');
  }

  return new Promise((resolve, reject) => {
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        reject(new Error('No speech detected.'));
        return;
      }
      resolve(transcript);
    };

    recognition.onerror = () => reject(new Error('Speech recognition failed.'));
    recognition.start();
    setTimeout(() => recognition.stop(), 9000);
  });
};
