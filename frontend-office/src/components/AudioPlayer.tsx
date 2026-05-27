import React, { useRef, useState, useEffect } from 'react';
import Waveform from './Waveform';
import { useAudioPeaks } from '../hooks/useAudioPeaks';

interface Props {
  src: string;
}

export default function AudioPlayer({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const peaks = useAudioPeaks(src);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  }

  function seek(pct: number) {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = pct * duration;
  }

  function fmt(s: number) {
    if (!isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  const progress = duration ? current / duration : 0;

  return (
    <div className="flex items-center gap-2 rounded-lg p-2 mt-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 text-[#0a0908]"
        style={{ background: 'linear-gradient(135deg, #5b8def, #4a7ab8)' }}>
        {playing ? '⏸' : '▶'}
      </button>
      <Waveform peaks={peaks} progress={progress} onSeek={seek} />
      <span className="text-[10px] text-[var(--muted)] shrink-0 tabular-nums font-mono">{fmt(current)}</span>
    </div>
  );
}
