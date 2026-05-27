import { useRef, useEffect } from 'react';

interface Props {
  peaks: number[];
  progress: number;
  onSeek: (pct: number) => void;
}

export default function Waveform({ peaks, progress, onSeek }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const barW = w / peaks.length - 1;
    ctx.clearRect(0, 0, w, h);
    peaks.forEach((p, i) => {
      const barH = Math.max(2, p * h * 0.85);
      const x = i * (barW + 1);
      const y = (h - barH) / 2;
      const played = i / peaks.length <= progress;
      ctx.fillStyle = played ? '#5b8def' : 'rgba(255,255,255,0.15)';
      ctx.fillRect(x, y, barW, barH);
    });
  }, [peaks, progress]);

  return (
    <canvas ref={canvasRef} width={160} height={28} className="flex-1 cursor-pointer h-7 w-full max-w-[160px]"
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek((e.clientX - rect.left) / rect.width);
      }} />
  );
}
