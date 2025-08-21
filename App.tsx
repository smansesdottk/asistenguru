
import React, { useState, useEffect, useCallback } from 'react';
import type { UserProfile, PublicConfig, Theme } from './types';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');


  // State untuk notifikasi pembaruan PWA
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Effect to apply selected theme (light/dark/system)
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      // Always clean up first
      root.classList.remove('dark');

      if (theme === 'dark' || (theme === 'system' && mediaQuery.matches)) {
        root.classList.add('dark');
      }
    };

    applyTheme();
    localStorage.setItem('theme', theme);

    // If system theme is selected, we need to listen for OS-level changes
    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);


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