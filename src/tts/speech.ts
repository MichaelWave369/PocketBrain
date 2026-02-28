export const isSpeechSynthesisSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

export const waitForVoices = async (): Promise<SpeechSynthesisVoice[]> => {
  if (!isSpeechSynthesisSupported()) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    return voices;
  }

  return new Promise((resolve) => {
    const handler = () => {
      const next = window.speechSynthesis.getVoices();
      resolve(next);
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    }, 1500);
  });
};
