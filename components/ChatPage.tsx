import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, UserProfile, PublicConfig, ChatConversation } from '../types';
import { MessageRole } from '../types';
import ChatMessageBubble from './ChatMessageBubble';
import ChatInput from './ChatInput';
import StatusIndicator from './StatusIndicator';
import Sidebar from './Sidebar';
import MenuIcon from './icons/MenuIcon';
import PromptStarters from './PromptStarters';

type Status = 'checking' | 'connected' | 'error' | 'unconfigured';
interface StatusDetail {
  status: Status;
  message?: string;
}

interface ChatPageProps {
  user: UserProfile;
  config: PublicConfig;
  onLogout: () => void;
  isUpdateAvailable: boolean;
  onUpdate: () => void;
}

const OLD_CHAT_HISTORY_KEY = 'chat_history_v1';
const CHAT_HISTORY_KEY = 'chat_history_v2';


const ChatPage: React.FC<ChatPageProps> = ({ user, config, onLogout, isUpdateAvailable, onUpdate }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [promptStarters, setPromptStarters] = useState<string[]>([]);
  const [isLoadingStarters, setIsLoadingStarters] = useState(true);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false); // State untuk mencegah race condition
  
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
            behavior: 'smooth'
        });
    }
  }, [conversations, activeConversationId]);

  // Load conversations from localStorage on initial render
  useEffect(() => {
    // Check for new conversation format first
    const savedConversationsRaw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedConversationsRaw) {
        try {
            const savedConversations = JSON.parse(savedConversationsRaw);
            if (Array.isArray(savedConversations) && savedConversations.length > 0) {
                setConversations(savedConversations);
                setActiveConversationId(savedConversations[0].id); // Activate the most recent one
                fetch('/api/status').then(res => res.json()).then(setSystemStatus);
                setIsHistoryLoaded(true); // Tandai history sudah dimuat
                return;
            }
        } catch (e) {
            console.error("Failed to parse new chat history, clearing.", e);
            localStorage.removeItem(CHAT_HISTORY_KEY);
        }
    }
    
    // Migration logic: Check for old format if new one doesn't exist
    const oldHistoryRaw = localStorage.getItem(OLD_CHAT_HISTORY_KEY);
    if (oldHistoryRaw) {
      try {
        const oldMessages = JSON.parse(oldHistoryRaw);
        if (Array.isArray(oldMessages) && oldMessages.length > 0) {
          console.log("Migrating old chat history to new format...");
          const newConversation: ChatConversation = {
            id: new Date().toISOString(),
            title: "Riwayat Chat Sebelumnya",
            messages: oldMessages,
            createdAt: new Date().toISOString(),
          };
          setConversations([newConversation]);
          setActiveConversationId(newConversation.id);
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([newConversation]));
          localStorage.removeItem(OLD_CHAT_HISTORY_KEY);
          fetch('/api/status').then(res => res.json()).then(setSystemStatus);
          setIsHistoryLoaded(true); // Tandai history sudah dimuat
          return;
        }
      } catch (e) {
        console.error("Failed to parse old chat history, clearing.", e);
        localStorage.removeItem(OLD_CHAT_HISTORY_KEY);
      }
    }
    
    // If no history at all, initialize status check and mark loading as complete
    fetch('/api/status').then(res => res.json()).then(setSystemStatus);
    setIsHistoryLoaded(true); // Tetap tandai selesai walau tidak ada history

  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    // Hanya simpan jika history sudah selesai dimuat untuk mencegah race condition
    if (!isHistoryLoaded) return;

    if (conversations.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversations));
    } else {
      // If all conversations are deleted, clear storage
      localStorage.removeItem(CHAT_HISTORY_KEY);
    }
  }, [conversations, isHistoryLoaded]);
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeMessages = activeConversation?.messages ?? [];

  // Fetch prompt starters when starting a new chat
  useEffect(() => {
    const fetchPromptStarters = async () => {
      setIsLoadingStarters(true);
      try {
        const response = await fetch('/api/prompt-starters');
        if (response.ok) {
          const data = await response.json();
          setPromptStarters(data.questions || []);
        } else {
           setPromptStarters([]);
        }
      } catch (error) {
        console.error("Failed to fetch prompt starters:", error);
        setPromptStarters([]);
      } finally {
        setIsLoadingStarters(false);
      }
    };
    
    // Fetch only if it's a new chat (no active messages) and not currently loading a response
    if (activeMessages.length === 0 && !isLoading) {
      fetchPromptStarters();
    }
  }, [activeMessages.length, isLoading]);


  const handleNewChat = () => {
    setActiveConversationId(null);
    setIsSidebarOpen(false);
  };
  
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    const updatedConversations = conversations.filter(c => c.id !== id);
    setConversations(updatedConversations);

    if (activeConversationId === id) {
      // If the active chat was deleted, switch to the newest one or start a new chat
      setActiveConversationId(updatedConversations[0]?.id ?? null);
    }
  };
  
  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: MessageRole.USER,
      text: inputText,
    };
    
    setIsLoading(true);
    let currentConversationId = activeConversationId;
    let conversationToUpdate: ChatConversation;

    if (!currentConversationId || !activeConversation) {
      // This is a new conversation
      const newConversation: ChatConversation = {
        id: new Date().toISOString(),
        title: inputText.split(' ').slice(0, 5).join(' '),
        messages: [userMessage, { role: MessageRole.MODEL, text: '' }],
        createdAt: new Date().toISOString(),
      };
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      currentConversationId = newConversation.id;
      conversationToUpdate = newConversation;

    } else {
       // This is an existing conversation
       conversationToUpdate = {
        ...activeConversation,
        messages: [...activeConversation.messages, userMessage, { role: MessageRole.MODEL, text: '' }],
       };
       setConversations(prev => prev.map(c => c.id === currentConversationId ? conversationToUpdate : c));
    }


    try {
      // Send message history *without* the last empty placeholder
      const messageHistory = conversationToUpdate.messages.slice(0, -1);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messageHistory }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Request gagal dengan status ${response.status}`}));
        if(response.status === 401) {
          alert("Sesi Anda telah berakhir. Silakan login kembali.");
          onLogout();
          return;
        }
        throw new Error(errorData.error || `Error: ${response.statusText}`);
      }
      
      if (!response.body) throw new Error("Response body is empty.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let accumulatedText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        
        setConversations(prev =>
          prev.map(c => {
            if (c.id === currentConversationId) {
               // Create a new messages array for immutability
              const newMessages = [...c.messages];
              // Update the last message (the bot's response)
              newMessages[newMessages.length - 1] = {
                role: MessageRole.MODEL,
                text: accumulatedText,
              };
               // Return a new conversation object
              return { ...c, messages: newMessages };
            }
            return c;
          })
        );
      }

    } catch (error) {
      const errorMessageText = error instanceof Error ? `Maaf, terjadi kesalahan: ${error.message}` : 'Maaf, terjadi kesalahan yang tidak diketahui.';
      setConversations(prev => prev.map(c => {
        if (c.id === currentConversationId) {
           const updatedMessages = [...c.messages];
           updatedMessages[updatedMessages.length - 1] = { role: MessageRole.MODEL, text: errorMessageText };
           return { ...c, messages: updatedMessages };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = (messageIndex: number) => {
    if (!activeConversation) return;

    const updatedMessages = activeConversation.messages.filter((_, index) => index !== messageIndex);
    const updatedConversation = { ...activeConversation, messages: updatedMessages };

    setConversations(prev => prev.map(c => c.id === activeConversationId ? updatedConversation : c));
  };
  
  const getWelcomeMessage = useCallback(() => {
    const isSheetsConnected = systemStatus.sheets.status === 'connected';
    const isGeminiConnected = systemStatus.gemini.status === 'connected';

    let text = `Halo, ${user.name}! `;
    if (isSheetsConnected && isGeminiConnected) {
      text += 'Saya sudah terhubung dengan data sekolah. Ada yang bisa saya bantu?';
    } else {
      text += `Ada beberapa masalah koneksi:\n- Data: ${systemStatus.sheets.message}\n- API: ${systemStatus.gemini.message}\n\nFungsionalitas mungkin terbatas.`;
    }
    return { role: MessageRole.MODEL, text };
  }, [systemStatus, user.name]);


  return (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-800 font-sans">
      <Sidebar 
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex flex-col flex-1">
        <header className="bg-white dark:bg-gray-900 shadow-md p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 md:hidden">
                <MenuIcon />
              </button>
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
          {activeMessages.length === 0 && !isLoading && (
            <div className="flex justify-center items-center h-full">
                <PromptStarters 
                    prompts={promptStarters}
                    onSelectPrompt={handleSendMessage}
                    isLoading={isLoadingStarters}
                />
            </div>
          )}
          {activeMessages.map((msg, index) => (
            (isLoading && index === activeMessages.length - 1 && msg.text === '') ? null :
            <ChatMessageBubble 
              key={`${activeConversationId}-${index}`} 
              message={msg} 
              onDelete={() => handleDeleteMessage(index)} 
            />
          ))}
          {isLoading && activeMessages[activeMessages.length-1]?.text === '' && (
            <div className="flex justify-start items-center space-x-3">
               <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center">
                 <svg className="w-6 h-6 text-slate-500 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
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
          {isUpdateAvailable && (
            <div className="bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-lg p-3 flex items-center justify-between gap-4 mb-4">
              <p className="font-medium text-sm">Pembaruan aplikasi tersedia.</p>
              <button 
                  onClick={onUpdate}
                  className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                  Perbarui
              </button>
            </div>
          )}
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
           <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
            Asisten Guru AI | Versi {config.appVersion || 'N/A'} | Author : A. Indra Malik - sman11mks
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;