'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileStack, Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';
const themeKey = 'ihatepdf-theme';

export function LandingHeader() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function syncTheme() {
      let stored: string | null = null;
      try { stored = localStorage.getItem(themeKey); } catch { /* Theme works even when storage is blocked. */ }
      const next = stored === 'dark' || stored === 'light' ? stored : media.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      setTheme(next);
    }
    syncTheme();
    media.addEventListener('change', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => { media.removeEventListener('change', syncTheme); window.removeEventListener('storage', syncTheme); };
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(themeKey, next); } catch { /* Keep the current session's theme. */ }
  }

  return (
    <header className="landing landing-header">
      <a className="landing-skip" href="#contenido">Saltar al contenido</a>
      <div className="landing-nav">
        <Link href="/" className="landing-brand" aria-label="IHatePDF, inicio"><span className="brand-icon"><FileStack size={20} strokeWidth={1.7} aria-hidden="true" /></span>IHatePDF<span className="brand-dot">.</span></Link>
        <nav aria-label="Navegación principal"><a href="#herramientas">Herramientas</a><a href="#privacidad">Privacidad</a></nav>
        <div className="landing-nav-actions"><button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'} title={theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'}><Moon className="theme-moon" size={18} aria-hidden="true" /><Sun className="theme-sun" size={19} aria-hidden="true" /></button><a className="nav-start" href="#herramientas">Empezar <ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </div>
    </header>
  );
}
