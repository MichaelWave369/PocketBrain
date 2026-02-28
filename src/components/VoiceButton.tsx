import { VoiceWaveform } from './VoiceWaveform';
import type { VoiceState } from '../voice/types';

interface VoiceButtonProps {
  state: VoiceState;
  elapsedLabel: string;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onCancel: () => void;
  onRetry: () => void;
}

export const VoiceButton = ({ state, elapsedLabel, onStart, onStop, onCancel, onRetry }: VoiceButtonProps) => {
  if (state === 'recording') {
    return (
      <div className="voice-controls">
        <VoiceWaveform active />
        <span className="voice-elapsed">{elapsedLabel}</span>
        <button aria-label="Stop recording" onClick={() => void onStop()}>
          Stop
        </button>
        <button className="ghost" aria-label="Cancel recording" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  if (state === 'requesting_permission' || state === 'transcribing') {
    return (
      <button className="ghost" disabled aria-label="Voice state pending">
        {state === 'requesting_permission' ? 'Mic permission…' : 'Transcribing…'}
      </button>
    );
  }

  if (state === 'error') {
    return (
      <button className="ghost danger" aria-label="Retry voice recording" onClick={onRetry}>
        Retry voice
      </button>
    );
  }

  return (
    <button className="ghost" aria-label="Start voice recording" onClick={() => void onStart()}>
      🎤 Voice
    </button>
  );
};
