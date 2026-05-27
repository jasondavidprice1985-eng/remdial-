import React, { useRef } from 'react';
import { resizeImageToBase64 } from '../utils/imageResize';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  disabled: boolean;
}

export default function PhotoUpload({ images, onChange, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const encoded = await Promise.all(files.slice(0, 5 - images.length).map(resizeImageToBase64));
    onChange([...images, ...encoded]);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {images.map((b64, i) => (
          <div key={i} className="relative group">
            <img src={`data:image/jpeg;base64,${b64}`} alt={`photo ${i + 1}`}
              className="w-full aspect-square object-cover rounded-xl ring-1 ring-[var(--border)]" />
            <button type="button" disabled={disabled}
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 w-5 h-5 rounded-full text-[10px] font-bold text-white opacity-90"
              style={{ background: 'var(--danger)' }}>×</button>
          </div>
        ))}
      </div>
      {images.length < 5 && (
        <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl py-10 text-base border-2 border-dashed border-stone-300 text-[var(--muted)] hover:border-[var(--action)] transition-colors">
          <span className="block text-2xl mb-1 opacity-60">📷</span>
          Add Photos
          <span className="block text-[10px] mt-1 opacity-70">Tap to take photo</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple
        className="hidden" onChange={handleFiles} disabled={disabled} />
    </div>
  );
}
