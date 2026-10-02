import { useState, useEffect } from 'react';
import { Lock, Loader2 } from 'lucide-react';

const PASSWORD = '5223';
const STORAGE_KEY = 'app_unlocked';

export function LockScreen({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === '1') setUnlocked(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(false);
    setTimeout(() => {
      if (input === PASSWORD) {
        sessionStorage.setItem(STORAGE_KEY, '1');
        setUnlocked(true);
      } else {
        setError(true);
        setInput('');
      }
      setChecking(false);
    }, 400);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 space-y-6 animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center">
              <Lock size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">كلمة المرور</h1>
            <p className="text-sm text-slate-400">أدخل كلمة المرور للدخول</p>
          </div>

          <div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              className={`w-full text-center text-2xl font-bold tracking-[0.5em] px-4 py-3.5 rounded-xl border-2 transition-all focus:outline-none ${
                error
                  ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-slate-400 focus:border-transparent'
              }`}
              placeholder="••••"
              maxLength={4}
              dir="ltr"
            />
            {error && (
              <p className="text-sm text-red-500 text-center mt-2 font-semibold">كلمة المرور غير صحيحة</p>
            )}
          </div>

          <button
            type="submit"
            disabled={checking || input.length === 0}
            className="btn-primary w-full py-3.5 text-base"
          >
            {checking ? <Loader2 size={20} className="animate-spin" /> : 'دخول'}
          </button>
        </div>
      </form>
    </div>
  );
}
