
import React, { useState, useEffect, useCallback } from 'react';
import type { UserProfile, PublicConfig } from './types';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-slate-600">Memuat aplikasi...</div>
      </div>
    );
  }

  return user ? (
    <ChatPage user={user} config={config} onLogout={handleLogout} />
  ) : (
    <LoginPage config={config} onLogin={handleLogin} />
  );
};

export default App;
