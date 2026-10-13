import { createPocketBrainTiny } from './pocketbrain-tiny.mjs';

const loadButton = document.querySelector('#load');
const generateButton = document.querySelector('#generate');
const deviceSelect = document.querySelector('#device');
const status = document.querySelector('#status');
const progress = document.querySelector('#progress');
const prompt = document.querySelector('#prompt');
const reply = document.querySelector('#reply');
const metrics = document.querySelector('#metrics');
let brain = null;

function progressLabel(event) {
  const detail = typeof event?.status === 'string' ? event.status : 'Loading';
  const file = typeof event?.file === 'string' ? ' · ' + event.file.split('/').at(-1) : '';
  return detail + file;
}

loadButton.addEventListener('click', async () => {
  loadButton.disabled = true;
  deviceSelect.disabled = true;
  status.textContent = 'Loading browser inference runtime…';
  progress.hidden = false;
  const started = performance.now();
  try {
    brain = await createPocketBrainTiny({
      preferredDevice: deviceSelect.value,
      onProgress(event) {
        status.textContent = progressLabel(event);
        if (typeof event?.progress === 'number') {
          progress.value = Math.max(0, Math.min(100, event.progress));
        }
      },
    });
    progress.hidden = true;
    status.textContent = 'READY · ' + brain.model + ' · ' + brain.device + ' / ' + brain.dtype;
    metrics.textContent = 'Initialization elapsed: ' + ((performance.now() - started) / 1000).toFixed(2) + 's (includes any downloads).';
    generateButton.disabled = false;
  } catch (error) {
    status.textContent = 'Model failed: ' + (error instanceof Error ? error.message : String(error));
    loadButton.disabled = false;
    deviceSelect.disabled = false;
    progress.hidden = true;
  }
});

generateButton.addEventListener('click', async () => {
  if (!brain || !prompt.value.trim()) {
    reply.textContent = 'Enter a prompt first.';
    return;
  }
  generateButton.disabled = true;
  reply.textContent = 'Generating with actual model weights…';
  const started = performance.now();
  try {
    const answer = await brain.generate(prompt.value, { maxNewTokens: 64 });
    reply.textContent = answer;
    metrics.textContent = 'Generation wall time: ' + ((performance.now() - started) / 1000).toFixed(2) + 's. Not a comparable benchmark.';
  } catch (error) {
    reply.textContent = 'Generation failed: ' + (error instanceof Error ? error.message : String(error));
  } finally {
    generateButton.disabled = false;
  }
});
