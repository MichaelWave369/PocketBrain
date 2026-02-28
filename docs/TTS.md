# TTS in PocketBrain v0.5.0

PocketBrain uses the browser SpeechSynthesis API for voice output.

- TTS is optional and disabled by default.
- Works entirely on-device with browser-provided voices.
- Supports speak/pause/resume/stop and per-message Speak buttons.
- If voices are unavailable, chat still works and TTS shows a graceful unsupported state.

## Settings
- Enable TTS
- Auto-read assistant replies (off by default)
- Voice, rate, pitch, volume

## Troubleshooting
- No voices: wait for async voice loading or try another browser.
- Interrupted speech: browser tab/audio focus may pause synthesis.
