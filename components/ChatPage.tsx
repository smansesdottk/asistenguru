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

  useEffect(() => {
    const initializeApp = async () => {
      setMessages([
          {
            role: MessageRole.MODEL,
            text: `Halo, ${user.name}! Saya akan memeriksa koneksi ke sistem. Mohon tunggu sebentar...`,
          },
      ]);
      
      try {
        const statusResponse = await fetch('/.netlify/functions/status');
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
          initialMessage = `Halo! Ada beberapa masalah koneksi:\n- Google Sheets: ${statusData.sheets.message}\n- Gemini API: ${statusData.gemini.message}\n\nMohon periksa konfigurasi environment variables di Netlify. Fungsionalitas mungkin terbatas.`;
        }
        setMessages([{ role: MessageRole.MODEL, text: initialMessage }]);

      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const finalMessage = `Gagal memeriksa status sistem: ${errorMessage}. Pastikan backend berjalan dengan benar dan environment variables sudah diatur di Netlify.`;
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
      const response = await fetch('/.netlify/functions/chat', {
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="bg-white shadow-md p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
            <div>
                <h1 className="text-lg font-bold text-slate-800">{user.name}</h1>
                <p className="text-xs text-slate-500">{user.email}</p>
            </div>
        </div>
        <div className="flex flex-col items-end gap-1">
            <StatusIndicator status={systemStatus} />
            <button onClick={onLogout} className="text-xs text-blue-600 hover:underline">
                Logout
            </button>
        </div>
      </header>

      <main
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
      >
        {messages.map((msg, index) => (
          <ChatMessageBubble key={index} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start items-center space-x-3">
             <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
               <svg className="w-6 h-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
             </div>
             <div className="bg-slate-200 p-3 rounded-lg flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white p-4 border-t border-slate-200">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || !isInitialized} />
         <p className="text-center text-xs text-slate-400 mt-2">
          Dibuat oleh A. Indra Malik - SMAN11MKS | Versi {config.appVersion || 'N/A'}
        </p>
      </footer>
    </div>
  );
};

export default ChatPage;