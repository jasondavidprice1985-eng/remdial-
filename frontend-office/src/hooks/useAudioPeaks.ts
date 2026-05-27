import { useState, useEffect } from 'react';

export function useAudioPeaks(src: string): number[] {
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(buf => {
        const ctx = new AudioContext();
        return ctx.decodeAudioData(buf).then(audio => {
          ctx.close();
          if (cancelled) return;
          const data = audio.getChannelData(0);
          const bars = 40;
          const step = Math.max(1, Math.floor(data.length / bars));
          const p: number[] = [];
          for (let i = 0; i < bars; i++) {
            let max = 0;
            for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(data[i * step + j] || 0));
            p.push(max);
          }
          setPeaks(p);
        });
      })
      .catch(() => { if (!cancelled) setPeaks(Array(40).fill(0.25)); });
    return () => { cancelled = true; };
  }, [src]);

  return peaks;
}
