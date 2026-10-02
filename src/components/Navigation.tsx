import { LayoutDashboard, ClipboardList, DoorOpen, Wallet, Globe, Moon, Sun, Settings, X } from 'lucide-react';
import { useApp, type ViewName } from '@/context/AppContext';
import { useI18n, LANGS, type Lang } from '@/context/I18nContext';
import { useTheme } from '@/context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { SupportAbout } from '@/components/SupportAbout';

const NAV_ITEMS: { id: ViewName; labelKey: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { id: 'schedule', labelKey: 'work_schedule', icon: ClipboardList },
  { id: 'checkout', labelKey: 'checkout', icon: DoorOpen },
  { id: 'archive', labelKey: 'archive', icon: Wallet },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-semibold"
      title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function LangSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-semibold"
      >
        <Globe size={18} />
        <span className="hidden sm:inline">{LANGS.find((l) => l.code === lang)?.label}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 end-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[140px] z-50 animate-slide-down">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code as Lang); setOpen(false); }}
              className={`w-full text-start px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                lang === l.code ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useI18n();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('settings')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <SupportAbout />
      </div>
    </div>
  );
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-semibold"
      title={t('settings')}
    >
      <Settings size={18} />
    </button>
  );
}

export function Sidebar() {
  const { view, setView } = useApp();
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-3 px-3 py-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 dark:from-slate-700 dark:to-slate-500 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{t('app_title')}</h1>
            <p className="text-xs text-slate-400">إدارة الشقق والحجوزات</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 mt-4 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 px-1 pt-2 border-t border-slate-100 dark:border-slate-800">
          <ThemeToggle />
          <LangSwitcher />
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </div>
      </aside>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export function BottomNav() {
  const { view, setView } = useApp();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
                  active ? 'text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800' : 'text-slate-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-[9px] font-semibold leading-tight text-center">{t(item.labelKey)}</span>
              </button>
            );
          })}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-slate-400 transition-all"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span className="text-[9px] font-semibold leading-tight text-center">{theme === 'dark' ? t('light_mode') : t('dark_mode')}</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-slate-400 transition-all"
          >
            <Settings size={20} />
            <span className="text-[9px] font-semibold leading-tight text-center">{t('settings')}</span>
          </button>
        </div>
      </nav>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export { LangSwitcher };
