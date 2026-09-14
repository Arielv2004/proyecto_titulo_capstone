import { create } from 'zustand';

// Obtener tema inicial guardado o preferencia del sistema operativo
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  
  const saved = localStorage.getItem('mymedrecord_theme');
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }
  
  // Si no hay preferencia guardada, consultar preferencia del sistema
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};

// Aplicar clase al elemento <html>
const applyThemeToDocument = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create((set, get) => {
  const initialTheme = getInitialTheme();
  applyThemeToDocument(initialTheme);

  return {
    theme: initialTheme,
    isDark: initialTheme === 'dark',

    toggleTheme: () => {
      const currentTheme = get().theme;
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      localStorage.setItem('mymedrecord_theme', nextTheme);
      applyThemeToDocument(nextTheme);
      
      set({ 
        theme: nextTheme, 
        isDark: nextTheme === 'dark' 
      });
    },

    setTheme: (newTheme) => {
      if (newTheme !== 'light' && newTheme !== 'dark') return;
      
      localStorage.setItem('mymedrecord_theme', newTheme);
      applyThemeToDocument(newTheme);
      
      set({ 
        theme: newTheme, 
        isDark: newTheme === 'dark' 
      });
    }
  };
});
