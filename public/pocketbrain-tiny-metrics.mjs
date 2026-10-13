// Pure, network-free helpers for the PocketBrain Tiny experimental runtime.
// Callback metrics measure events observed at the JS layer, not GPU profiler time.
export const TINY_RUN_SCHEMA = 'POCKETBRAIN_TINY_RUN_V2';
export const TINY_MODES = Object.freeze({
  baseline: Object.freeze({ label: 'Baseline greedy', repetition_penalty: 1, no_repeat_ngram_size: 0 }),
  guarded: Object.freeze({ label: 'Repeat guard greedy', repetition_penalty: 1.12, no_repeat_ngram_size: 3 }),
});

export function selectTinyGeneration(mode = 'baseline', requestedTokens = 64, cap = 96) {
  const modeConfig = TINY_MODES[mode];
  if (!modeConfig) throw new Error('Unknown generation mode.');
  const max_new_tokens = Number.isFinite(requestedTokens)
    ? Math.max(1, Math.min(cap, Math.floor(requestedTokens)))
    : 64;
  return {
    mode,
    options: {
      max_new_tokens,
      do_sample: false,
      repetition_penalty: modeConfig.repetition_penalty,
      no_repeat_ngram_size: modeConfig.no_repeat_ngram_size,
      return_full_text: false,
    },
  };
}

const ms = (value) => Number.isFinite(value) ? Math.round(Math.max(0, value) * 100) / 100 : null;

export function createTinyRunReceipt({
  model, device, dtype, mode, config, runNumber, startMs, firstTokenMs,
  firstVisibleTextMs, finishMs, tokenCallbackEvents, inputChars, outputChars,
}) {
  const duration = Math.max(0, finishMs - startMs);
  return {
    schema: TINY_RUN_SCHEMA,
    evidence: 'BROWSER_SELF_REPORTED_UNVERIFIED',
    model,
    backend: device,
    dtype,
    mode,
    decode: {
      max_new_tokens: config.max_new_tokens,
      do_sample: config.do_sample,
      repetition_penalty: config.repetition_penalty,
      no_repeat_ngram_size: config.no_repeat_ngram_size,
    },
    run_index_this_session: runNumber,
    generation_wall_ms: ms(duration),
    time_to_first_token_callback_ms: firstTokenMs == null ? null : ms(firstTokenMs - startMs),
    time_to_first_visible_text_ms: firstVisibleTextMs == null ? null : ms(firstVisibleTextMs - startMs),
    observed_token_callback_events: tokenCallbackEvents,
    callback_events_per_second_full_wall: duration > 0
      ? ms(tokenCallbackEvents * 1000 / duration)
      : null,
    prompt_char_count: inputChars,
    output_char_count: outputChars,
    prompt_or_output_text_in_receipt: false,
    timing_note: 'JS callback observations; generation wall includes prompt/prefill. Not GPU decode throughput.',
    cache_status: 'NOT_MEASURED',
    external_reference_parity: 'NOT_TESTED',
  };
}
