import { createPocketBrainTiny } from './pocketbrain-tiny.mjs';

const $ = (id) => document.getElementById(id);
const loadButton = $('load');
const generateButton = $('generate');
const deviceSelect = $('device');
const modeSelect = $('mode');
const tokenLimit = $('token-limit');
const status = $('status');
const progress = $('progress');
const prompt = $('prompt');
const reply = $('reply');
const metrics = $('metrics');
const receiptBox = $('receipt');
const copyReceipt = $('copy-receipt');
const recentRuns = $('recent-runs');

let brain = null;
let lastReceipt = null;
const runs = [];

function progressLabel(event) {
  const detail = typeof event?.status === 'string' ? event.status : 'Loading';
  const file = typeof event?.file === 'string' ? ' · ' + event.file.split('/').at(-1) : '';
  return detail + file;
}
function fmt(ms) {
  return ms == null ? 'not observed' : ms.toFixed(2) + ' ms';
}
function renderRecentRuns() {
  recentRuns.replaceChildren();
  for (const run of runs.slice(-6).reverse()) {
    const li = document.createElement('li');
    li.textContent = '#' + run.run_index_this_session + ' · ' + run.mode +
      ' · ' + run.generation_wall_ms + ' ms · ' +
      run.observed_token_callback_events + ' token callback events';
    recentRuns.append(li);
  }
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
    metrics.textContent = 'Initialization: ' + ((performance.now() - started) / 1000).toFixed(2) +
      ' s (downloads may be included; cache state unknown).';
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
  copyReceipt.disabled = true;
  lastReceipt = null;
  receiptBox.textContent = 'A receipt appears after a completed model run.';
  reply.textContent = 'Waiting for first visible token…';
  metrics.textContent = 'Generating on device…';
  try {
    const result = await brain.generateWithReceipt(prompt.value, {
      mode: modeSelect.value,
      maxNewTokens: Number(tokenLimit.value),
      onText: (text) => { reply.textContent = text; },
    });
    reply.textContent = result.text;
    lastReceipt = { ...result.receipt, initialization_ms_this_session: brain.initializationMs };
    runs.push(lastReceipt);
    renderRecentRuns();
    const m = lastReceipt;
    metrics.textContent =
      'Wall: ' + fmt(m.generation_wall_ms) +
      ' · first token callback: ' + fmt(m.time_to_first_token_callback_ms) +
      ' · first visible text: ' + fmt(m.time_to_first_visible_text_ms) +
      ' · token callbacks: ' + m.observed_token_callback_events +
      ' · ' + (m.callback_events_per_second_full_wall ?? 'n/a') +
      ' callback events/s (including prefill)';
    receiptBox.textContent = JSON.stringify(lastReceipt, null, 2);
    copyReceipt.disabled = false;
  } catch (error) {
    reply.textContent = 'Generation failed: ' + (error instanceof Error ? error.message : String(error));
    metrics.textContent = 'No successful generation receipt.';
  } finally {
    generateButton.disabled = false;
  }
});

copyReceipt.addEventListener('click', async () => {
  if (!lastReceipt) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastReceipt, null, 2));
    copyReceipt.textContent = 'Copied receipt';
  } catch {
    copyReceipt.textContent = 'Copy blocked; select JSON below';
  }
});
