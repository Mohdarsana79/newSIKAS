import { useEffect, useState } from 'react';

const useColorMode = () => {
  const [colorMode, setColorMode] = useState<string>(() => {
    // Check local storage or system preference on initial load
    if (typeof window !== 'undefined') {
      const savedMode = window.localStorage.getItem('color-theme');
      if (savedMode) {
        return savedMode;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light'; // Default fallback
  });

  useEffect(() => {
    const className = 'dark';
    const bodyClass = window.document.documentElement.classList;

    if (colorMode === 'dark') {
      bodyClass.add(className);
    } else {
      bodyClass.remove(className);
    }

    window.localStorage.setItem('color-theme', colorMode);
  }, [colorMode]);

  return [colorMode, setColorMode] as const;
};

export default useColorMode;
