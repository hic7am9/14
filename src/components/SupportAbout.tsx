import { MessageCircle, Phone, Info, Moon, Sun } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import { useTheme } from '@/context/ThemeContext';

const SUPPORT_PHONE = '9665XXXXXXXX';

export function SupportAbout() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-4">
      {/* Dark/Light Mode Toggle */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
            {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-amber-400" />}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('dark_mode')}</p>
            <p className="text-xs text-slate-400">{theme === 'dark' ? t('dark_mode') : t('light_mode')}</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          role="switch"
          aria-checked={theme === 'dark'}
          className={`relative w-12 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${theme === 'dark' ? 'left-1' : 'left-6'}`}
          />
        </button>
      </div>

      {/* Support & About */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Info size={20} className="text-slate-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('support_about')}</h3>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('about_description')}
        </p>

        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('app_version')}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">v1.0</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent('مرحباً، أحتاج للمساعدة في تطبيق إدارة الشقق')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-success flex-1"
          >
            <MessageCircle size={18} />
            {t('whatsapp_support')}
          </a>
          <a
            href={`tel:+${SUPPORT_PHONE}`}
            className="btn-primary flex-1"
          >
            <Phone size={18} />
            {t('call_support')}
          </a>
        </div>
      </div>
    </div>
  );
}
