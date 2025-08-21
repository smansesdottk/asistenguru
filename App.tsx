
import React, { useState, useEffect, useCallback } from 'react';
import type { UserProfile, PublicConfig, Theme } from './types';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';

// Helper function to safely get the initial theme from localStorage
function getInitialTheme(): Theme {
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      return savedTheme;
    }
  }
  return 'system';
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // State untuk notifikasi pembaruan PWA
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Consolidated theme management effect
  useEffect(() => {
    // 1. Define the media query and root element
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const root = window.document.documentElement;

    // 2. Define a handler for OS theme changes
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
        // This handler only runs when the OS theme *actually changes*.
        // We only care about this if the user's setting is 'system'.
        // We read from localStorage to get the user's most recent choice,
        // avoiding stale closures on the 'theme' state variable.
        if (localStorage.getItem('theme') === 'system') {
            if (event.matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    };

    // 3. Add the event listener for OS changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // 4. Apply the theme based on the current 'theme' state from React.
    // This part runs every time the user clicks a button, changing the state.
    if (theme === 'light') {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else if (theme === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else { // theme === 'system'
        localStorage.setItem('theme', 'system');
        // When switching TO system, immediately apply the current OS theme
        if (mediaQuery.matches) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }

    // 5. Cleanup function to remove the listener when the component unmounts.
    return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
}, [theme]); // This effect re-runs ONLY when the user's choice (the 'theme' state) changes.


  // Effect untuk pembaruan Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('Konten baru tersedia dan akan digunakan setelah semua tab ditutup. Menampilkan prompt pembaruan.');
                    setWaitingWorker(registration.waiting);
                    setIsUpdateAvailable(true);
                  } else {
                    console.log('Konten di-cache untuk penggunaan offline.');
                  }
                }
              };
            }
          };
        }).catch(error => {
          console.error('Error saat registrasi service worker:', error);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }
  }, []);
  
  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setIsUpdateAvailable(false);
    }
  };

  const initializeApp = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionResponse, configResponse] = await Promise.all([
        fetch('/api/auth-verify'),
        fetch('/api/config'),
      ]);

      if (sessionResponse.ok) {
        const userData = await sessionResponse.json();
        setUser(userData);
      } else {
        setUser(null);
      }

      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
      } else {
        console.error('Failed to load application configuration.');
        setConfig({}); // Set empty config on failure
      }

    } catch (error) {
      console.error('Initialization failed:', error);
      setUser(null);
      setConfig({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const handleLogin = () => {
    initializeApp(); // Re-initialize to get new session and config
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth-logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-gray-900">
        <div className="text-slate-600 dark:text-slate-300">Memuat aplikasi...</div>
      </div>
    );
  }

  return user ? (
    <ChatPage 
      user={user} 
      config={config} 
      onLogout={handleLogout} 
      isUpdateAvailable={isUpdateAvailable}
      onUpdate={handleUpdate}
      theme={theme}
      setTheme={setTheme}
    />
  ) : (
    <LoginPage config={config} onLogin={handleLogin} />
  );
};

export default App;
