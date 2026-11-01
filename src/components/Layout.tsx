import { useState, type ReactNode } from 'react';
import { DISCLAIMER } from '../constants';
import { saveTheme } from '../lib/storage';

interface Props {
  children: ReactNode;
  onOpenSettings?: () => void;
}

export default function Layout({ children, onOpenSettings }: Props) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    saveTheme(next);
    setDark(next);
  };

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">🔮 AI 사주 풀이</h1>
          <div className="flex items-center gap-2">
            {onOpenSettings && (
              <button type="button" onClick={onOpenSettings} className="btn-ghost">
                설정
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="btn-ghost"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-stone-100/95 px-4 py-2 text-center text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900/95 dark:text-stone-400">
        {DISCLAIMER}
      </footer>
    </div>
  );
}
