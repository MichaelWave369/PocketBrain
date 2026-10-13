import { createPocketBrainTinyClient } from './sdk/v0.1/index.mjs';

const loadButton = document.querySelector('#sdk-load');
const generateButton = document.querySelector('#sdk-generate');
const status = document.querySelector('#sdk-status');
const prompt = document.querySelector('#sdk-prompt');
const output = document.querySelector('#sdk-output');
const receipt = document.querySelector('#sdk-receipt');

const client = createPocketBrainTinyClient({
  onStateChange(next) {
    status.textContent = next.phase.toUpperCase() +
      (next.model ? ' · ' + next.model + ' · ' + next.device : '') +
      (next.error ? ' · ' + next.error : '');
  },
});

loadButton.addEventListener('click', async () => {
  loadButton.disabled = true;
  try {
    await client.load({
      preferredDevice: 'auto',
      onProgress(event) {
        if (typeof event?.status === 'string') status.textContent = 'Loading · ' + event.status;
      },
    });
    generateButton.disabled = false;
  } catch (e) {
    status.textContent = 'Load failed: ' + (e instanceof Error ? e.message : String(e));
    loadButton.disabled = false;
  }
});

generateButton.addEventListener('click', async () => {
  if (!prompt.value.trim()) return;
  generateButton.disabled = true;
  output.textContent = 'Generating…';
  try {
    const result = await client.generate(prompt.value, {
      mode: 'baseline',
      maxNewTokens: 64,
      onText(text) { output.textContent = text; },
    });
    output.textContent = result.text;
    receipt.textContent = JSON.stringify(result.receipt, null, 2);
  } catch (e) {
    output.textContent = 'Generation failed: ' + (e instanceof Error ? e.message : String(e));
  } finally {
    generateButton.disabled = false;
  }
});
