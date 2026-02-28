export const VoiceWaveform = ({ active }: { active: boolean }) => (
  <div className={`voice-wave ${active ? 'active' : ''}`} aria-hidden>
    {[1, 2, 3, 4, 5].map((bar) => (
      <span key={bar} style={{ animationDelay: `${bar * 0.12}s` }} />
    ))}
  </div>
);
