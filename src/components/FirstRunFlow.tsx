import { useState } from 'react';
import type { AppSettings } from '../types';

type ModeChoice = 'local' | 'bridge';
type BridgePreset = 'ollama-localhost' | 'openai-compatible';

interface FirstRunFlowProps {
  onComplete: (patch: Partial<AppSettings>) => Promise<void>;
}

export const FirstRunFlow = ({ onComplete }: FirstRunFlowProps) => {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<ModeChoice>('local');
  const [bridgePreset, setBridgePreset] = useState<BridgePreset>('ollama-localhost');
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      if (mode === 'local') {
        await onComplete({ localOnlyMode: true, providerType: 'local-webllm' });
      } else {
        const presetPatch: Partial<AppSettings> =
          bridgePreset === 'ollama-localhost'
            ? {
                localOnlyMode: false,
                providerType: 'ollama-bridge',
                bridgeEndpointUrl: 'http://localhost:11434',
                bridgeModelName: 'llama3.2:3b',
                bridgeApiKey: ''
              }
            : {
                localOnlyMode: false,
                providerType: 'openai-compatible-bridge',
                bridgeEndpointUrl: 'https://api.openai.com/v1',
                bridgeModelName: 'gpt-4o-mini'
              };

        await onComplete(presetPatch);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel first-run-panel">
      {step === 0 ? (
        <>
          <h2>Welcome to PocketBrain</h2>
          <p className="helper-text">
            PocketBrain is your private, phone-first AI brain. It remembers with local storage first, and only uses bridge
            endpoints when you choose.
          </p>
          <ul className="memory-list compact">
            <li>
              <strong>🔒 Private by default</strong>
              <span>Messages, memory, and voice notes stay on this device.</span>
            </li>
            <li>
              <strong>🧠 Memory-first</strong>
              <span>Pinned summary + recent turns + memory snippets power every reply.</span>
            </li>
            <li>
              <strong>🌉 Optional bridge</strong>
              <span>Use stronger models from endpoints you control.</span>
            </li>
          </ul>
          <button onClick={() => setStep(1)}>Get started</button>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <h2>Choose your default mode</h2>
          <label className="settings-row">
            <input type="radio" checked={mode === 'local'} onChange={() => setMode('local')} />
            <span>
              <strong>Local Only</strong> — works offline after model load, privacy-first, smaller models.
            </span>
          </label>
          <label className="settings-row">
            <input type="radio" checked={mode === 'bridge'} onChange={() => setMode('bridge')} />
            <span>
              <strong>I want stronger models</strong> — uses your bridge endpoint and may send prompt context.
            </span>
          </label>

          {mode === 'bridge' ? (
            <label className="settings-row">
              <span>Bridge preset</span>
              <select value={bridgePreset} onChange={(event) => setBridgePreset(event.target.value as BridgePreset)}>
                <option value="ollama-localhost">Ollama on localhost (http://localhost:11434)</option>
                <option value="openai-compatible">OpenAI-compatible endpoint</option>
              </select>
            </label>
          ) : null}

          <div className="chat-actions">
            <button className="ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button onClick={() => setStep(2)}>Continue</button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2>Quick tutorial (1 minute)</h2>
          <ol className="memory-list compact">
            <li>
              <strong>Record one voice note</strong>
              <span>Tap mic in Chat and save a quick note like “I prefer short morning workouts.”</span>
            </li>
            <li>
              <strong>Ask a follow-up question</strong>
              <span>Example: “What routine should I start tomorrow?”</span>
            </li>
            <li>
              <strong>Open Memory page</strong>
              <span>Check Timeline + Search to see what memory signals are available.</span>
            </li>
          </ol>
          <p className="helper-text">You can change mode anytime in Settings.</p>
          <div className="chat-actions">
            <button className="ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button onClick={() => void finish()} disabled={loading}>
              {loading ? 'Saving…' : 'Start using PocketBrain'}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
};
