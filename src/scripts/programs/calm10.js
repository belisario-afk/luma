// Calm 10 program timeline (approx 10 minutes).
// Aurora → Zen Flow → Stone Tessellation (soft)
// For now, "Zen Flow" maps to Firefly Flock with gentle defaults.

export function getCalm10Sequence() {
  // durations in seconds (tweak as you like)
  return [
    { scene: 'aurora-veils', duration: 240 },   // 4:00
    { scene: 'firefly-flock', duration: 240 },  // 4:00 (Zen Flow stand-in)
    { scene: 'stone-tessellation', duration: 120 } // 2:00
  ];
}