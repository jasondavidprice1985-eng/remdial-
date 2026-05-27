import { useState } from 'react';

export default function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <dialog open className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)' }} onClick={onClose}>
      <img src={src} alt="Full size" className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
      <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 rounded-full text-xl text-white"
        style={{ background: 'rgba(255,255,255,0.1)' }}>×</button>
    </dialog>
  );
}

export function useLightbox() {
  const [src, setSrc] = useState<string | null>(null);
  return { src, open: setSrc, close: () => setSrc(null) };
}
