import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: React.PropsWithChildren) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('fincontrol_theme');
    return (saved as Theme) || 'light';
  });

  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('fincontrol_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const togglePrivacyMode = () => {
    setPrivacyMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, privacyMode, togglePrivacyMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};