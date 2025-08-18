
import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, UserProfile, PublicConfig } from '../types';
import { MessageRole } from '../types';
import ChatMessageBubble from './ChatMessageBubble';
import ChatInput from './ChatInput';
import StatusIndicator from './StatusIndicator';

type Status = 'checking' | 'connected' | 'error' | 'unconfigured';
interface StatusDetail {
  status: Status;
  message?: string;
}

interface ChatPageProps {
  user: UserProfile;
  config: PublicConfig;
  onLogout: () => void;
}

const CHAT_HISTORY_KEY = 'chat_history_v1';

const ChatPage: React.FC<ChatPageProps> = ({ user, config, onLogout }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [systemStatus, setSystemStatus] = useState<{
    sheets: StatusDetail;
    gemini: StatusDetail;
  }>({
    sheets: { status: 'checking' },
    gemini: { status: 'checking' },
  });

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }
  }, [messages]);

  // Effect for initialization and loading chat history
  useEffect(() => {
    const initializeApp = async () => {
      // 1. Try to load from localStorage
      const savedMessagesRaw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedMessagesRaw) {
        try {
          const savedMessages = JSON.parse(savedMessagesRaw);
          if (Array.isArray(savedMessages) && savedMessages.length > 0) {
            setMessages(savedMessages);
            // Check status silently in the background to update indicators
            fetch('/api/status').then(res => res.json()).then(setSystemStatus).catch(e => console.error("Silent status check failed", e));
            setIsInitialized(true); // App is ready with history
            return; // Stop here, initialization is done
          }
        } catch (e) {
          console.error("Failed to parse chat history, starting fresh.", e);
          localStorage.removeItem(CHAT_HISTORY_KEY); // Clear corrupted data
        }
      }

      // 2. If no history, do the original initialization flow
      setMessages([
          {
            role: MessageRole.MODEL,
            text: `Halo, ${user.name}! Saya akan memeriksa koneksi ke sistem. Mohon tunggu sebentar...`,
          },
      ]);
      
      try {
        const statusResponse = await fetch('/api/status');
        if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            throw new Error(`Server returned status: ${statusResponse.status}. Pesan: ${errorText}`);
        }
        const statusData = await statusResponse.json();
        setSystemStatus(statusData);

        const isSheetsConnected = statusData.sheets.status === 'connected';
        const isGeminiConnected = statusData.gemini.status === 'connected';

        let initialMessage = '';
        if (isSheetsConnected && isGeminiConnected) {
          initialMessage = 'Koneksi berhasil! Saya sudah terhubung dengan data sekolah. Ada yang bisa saya bantu?';
        } else {
          initialMessage = `Halo! Ada beberapa masalah koneksi:\n- Google Sheets: ${statusData.sheets.message}\n- Gemini API: ${statusData.gemini.message}\n\nMohon periksa konfigurasi environment variables di Vercel. Fungsionalitas mungkin terbatas.`;
        }
        setMessages([{ role: MessageRole.MODEL, text: initialMessage }]);

      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const finalMessage = `Gagal memeriksa status sistem: ${errorMessage}. Pastikan backend berjalan dengan benar dan environment variables sudah diatur di Vercel.`;
          setSystemStatus({
              sheets: { status: 'error', message: 'Gagal menghubungi server status.' },
              gemini: { status: 'error', message: 'Gagal menghubungi server status.' },
          });
          setMessages([{ role: MessageRole.MODEL, text: finalMessage }]);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [user.name]);

  // Effect to save messages to localStorage whenever they change
  useEffect(() => {
    // Only save when the app is initialized. This prevents saving intermediate
    // states like the "checking connection..." message.
    if (isInitialized) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages, isInitialized]);


  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim() || isLoading || !isInitialized) return;

    const userMessage: ChatMessage = {
      role: MessageRole.USER,
      text: inputText,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const data = await response.json();
        if(response.status === 401) {
          // If session expired, force logout
          alert("Sesi Anda telah berakhir. Silakan login kembali.");
          onLogout();
          return;
        }
        throw new Error(data.error || `Request gagal dengan status ${response.status}`);
      }
      
      const data = await response.json();
      const aiMessage: ChatMessage = {
        role: MessageRole.MODEL,
        text: data.text,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: MessageRole.MODEL,
        text: error instanceof Error ? `Maaf, terjadi kesalahan: ${error.message}` : 'Maaf, terjadi kesalahan yang tidak diketahui.',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = (messageIndex: number) => {
    setMessages(currentMessages => currentMessages.filter((_, index) => index !== messageIndex));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-gray-800 font-sans">
      <header className="bg-white dark:bg-gray-900 shadow-md p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
            <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <StatusIndicator status={systemStatus} />
            <button onClick={onLogout} className="text-xs text-blue-600 dark:text-blue-400 hover:underline dark:hover:text-blue-300">
                Logout
            </button>
        </div>
      </header>

      <main
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
      >
        {messages.map((msg, index) => (
          <ChatMessageBubble 
            key={index} 
            message={msg} 
            onDelete={() => handleDeleteMessage(index)} 
          />
        ))}
        {isLoading && (
          <div className="flex justify-start items-center space-x-3">
             <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center">
               <svg className="w-6 h-6 text-slate-500 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
             </div>
             <div className="bg-slate-200 dark:bg-gray-700 p-3 rounded-lg flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-900 p-4 border-t border-slate-200 dark:border-gray-700">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || !isInitialized} />
         <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
          Asisten Guru AI | Versi {config.appVersion || 'N/A'} | Author : A. Indra Malik - sman11mks
        </p>
      </footer>
    </div>
  );
};

export default ChatPage;
