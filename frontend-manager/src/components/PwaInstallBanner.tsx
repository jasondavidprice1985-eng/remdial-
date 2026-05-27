import React, { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem('pwa_install_dismissed')) return;
    function onPrompt(e: Event) {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem('pwa_install_dismissed', '1');
    setVisible(false);
  }

  async function install() {
    if (!deferred.current) return;
    await deferred.current.prompt();
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up max-w-lg mx-auto"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="mx-4 card p-5 shadow-2xl" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <span className="text-lg">⬇</span>
          </div>
          <div>
            <p className="font-bold">Install FieldRem</p>
            <p className="text-sm text-[var(--muted)] mt-0.5">Add to your home screen for instant field access.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={install} className="btn-accent flex-1 h-11 text-sm">Install</button>
          <button onClick={dismiss} className="flex-1 h-11 rounded-xl text-sm font-medium text-[var(--muted)]"
            style={{ border: '1px solid var(--border)' }}>Not now</button>
        </div>
      </div>
    </div>
  );
}
