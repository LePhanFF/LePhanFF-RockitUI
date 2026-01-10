
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'cyber' | 'light' | 'metal';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('cyber');

  // Load from local storage or system pref on mount
  useEffect(() => {
    const saved = localStorage.getItem('rockit-theme') as Theme;
    if (saved) {
      setTheme(saved);
    }
  }, []);

  // Apply to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rockit-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    const modes: Theme[] = ['cyber', 'light', 'metal'];
    const nextIndex = (modes.indexOf(theme) + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
