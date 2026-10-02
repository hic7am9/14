import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem('install-dismissed');
      if (!dismissed) setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('install-dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 inset-x-4 lg:inset-x-auto lg:end-6 z-50 animate-slide-up max-w-sm lg:w-96">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('install_app')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('install_description')}</p>
        </div>
        <button
          onClick={handleInstall}
          className="btn-primary text-xs px-3 py-2 shrink-0"
        >
          {t('install')}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
