// src/components/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
      aria-label="Toggle dark mode"
    >
      {darkMode ? '🌞' : '🌙'}
    </button>
  );
}