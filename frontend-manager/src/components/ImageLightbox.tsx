import { useState } from 'react';

export default function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <dialog open className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-slide-up"
      style={{ background: 'rgba(0,0,0,0.92)' }} onClick={onClose}>
      <img src={src} alt="Full size" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()} />
      <button onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full text-xl text-white flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>×</button>
    </dialog>
  );
}

export function useLightbox() {
  const [src, setSrc] = useState<string | null>(null);
  return { src, open: setSrc, close: () => setSrc(null) };
}
