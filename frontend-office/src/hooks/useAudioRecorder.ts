import { useState, useRef } from 'react';

export function useAudioRecorder(): {
  recording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  getAudioPayload: () => Promise<{ audio: string; audio_mime: string } | null>;
} {
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((payload: { audio: string; audio_mime: string } | null) => void) | null>(null);

  async function startRecording() {
    if (!navigator.mediaDevices) {
      alert('Microphone requires a secure connection (HTTPS). Audio is unavailable over HTTP on mobile.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolveRef.current?.({
            audio: result.split(',')[1],
            audio_mime: recorder.mimeType.split(';')[0],
          });
          resolveRef.current = null;
        };
        reader.readAsDataURL(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Microphone access denied: ${msg}`);
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  function getAudioPayload() {
    return new Promise<{ audio: string; audio_mime: string } | null>(resolve => {
      resolveRef.current = resolve;
    });
  }

  return { recording, startRecording, stopRecording, getAudioPayload };
}
