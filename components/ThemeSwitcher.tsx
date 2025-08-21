import React from 'react';
import type { Theme } from '../types';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import SystemIcon from './icons/SystemIcon';

interface ThemeSwitcherProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, setTheme }) => {
  const themes: { name: Theme; icon: React.ReactNode; label: string }[] = [
    { name: 'light', icon: <SunIcon />, label: 'Terang' },
    { name: 'dark', icon: <MoonIcon />, label: 'Gelap' },
    { name: 'system', icon: <SystemIcon />, label: 'Sistem' },
  ];

  return (
    <div className="p-2">
      <div className="flex items-center justify-center p-1 bg-slate-200 dark:bg-gray-800 rounded-lg">
        {themes.map((item) => (
          <button
            key={item.name}
            onClick={() => setTheme(item.name)}
            className={`w-full flex justify-center items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
              theme === item.name
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-gray-700/50'
            }`}
            title={`Setel tema ke ${item.label}`}
            aria-pressed={theme === item.name}
          >
            {item.icon}
            <span className="sr-only">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
