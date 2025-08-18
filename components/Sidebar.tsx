import React, { useState } from 'react';
import type { ChatConversation } from '../types';
import PlusIcon from './icons/PlusIcon';
import DeleteIcon from './icons/DeleteIcon';

interface SidebarProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  isOpen,
  setIsOpen,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent onSelectConversation from firing
    if (window.confirm('Apakah Anda yakin ingin menghapus percakapan ini?')) {
      onDeleteConversation(id);
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-100 dark:bg-gray-900 border-r border-slate-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex-shrink-0`}>
        <div className="p-4 border-b border-slate-200 dark:border-gray-700">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon />
            Mulai Chat Baru
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <ul className="p-2 space-y-1">
            {sortedConversations.map((convo) => {
              const isActive = convo.id === activeConversationId;
              return (
                <li key={convo.id}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectConversation(convo.id);
                    }}
                    onMouseEnter={() => setHoveredId(convo.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                        : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="truncate flex-1 pr-2">{convo.title}</span>
                    {hoveredId === convo.id && (
                      <button 
                        onClick={(e) => handleDeleteClick(e, convo.id)}
                        className="p-1 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-500"
                        title="Hapus Percakapan"
                      >
                        <DeleteIcon />
                      </button>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
