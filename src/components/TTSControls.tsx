import type { TtsSettings } from '../tts/types';

interface TTSControlsProps {
  settings: TtsSettings;
  voices: SpeechSynthesisVoice[];
  state: string;
  onChange: (next: TtsSettings) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const TTSControls = ({ settings, voices, state, onChange, onPause, onResume, onStop }: TTSControlsProps) => (
  <article className="card">
    <h3>Voice Output (TTS)</h3>
    <p className="helper-text">State: {state}</p>
    <label className="settings-row">
      <span>Enable TTS</span>
      <input type="checkbox" checked={settings.enabled} onChange={(event) => onChange({ ...settings, enabled: event.target.checked })} />
    </label>
    <label className="settings-row">
      <span>Auto-read assistant replies</span>
      <input type="checkbox" checked={settings.autoReadReplies} onChange={(event) => onChange({ ...settings, autoReadReplies: event.target.checked })} />
    </label>
    <label className="settings-field">
      <span>Voice</span>
      <select value={settings.voiceURI} onChange={(event) => onChange({ ...settings, voiceURI: event.target.value })}>
        <option value="">Default voice</option>
        {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}
      </select>
    </label>
    <label className="settings-field">
      <span>Rate ({settings.rate.toFixed(1)})</span>
      <input type="range" min="0.5" max="2" step="0.1" value={settings.rate} onChange={(event) => onChange({ ...settings, rate: Number(event.target.value) })} />
    </label>
    <label className="settings-field">
      <span>Pitch ({settings.pitch.toFixed(1)})</span>
      <input type="range" min="0.5" max="2" step="0.1" value={settings.pitch} onChange={(event) => onChange({ ...settings, pitch: Number(event.target.value) })} />
    </label>
    <label className="settings-field">
      <span>Volume ({settings.volume.toFixed(1)})</span>
      <input type="range" min="0" max="1" step="0.1" value={settings.volume} onChange={(event) => onChange({ ...settings, volume: Number(event.target.value) })} />
    </label>
    <div className="settings-actions">
      <button className="ghost" onClick={onPause}>Pause</button>
      <button className="ghost" onClick={onResume}>Resume</button>
      <button className="ghost danger" onClick={onStop}>Stop speaking</button>
    </div>
  </article>
);
