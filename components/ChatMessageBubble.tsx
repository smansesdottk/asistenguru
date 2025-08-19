
import React, { useMemo, useState } from 'react';
import type { ChatMessage } from '../types';
import { MessageRole } from '../types';
import UserIcon from './icons/UserIcon';
import BotIcon from './icons/BotIcon';
import MarkdownTable from './MarkdownTable';
import CopyIcon from './icons/CopyIcon';
import ShareIcon from './icons/ShareIcon';
import DeleteIcon from './icons/DeleteIcon';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onDelete: () => void;
}

// Helper component for simple markdown (**bold**)
const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
};


const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, onDelete }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const isUser = message.role === MessageRole.USER;
  const showShareButton = typeof navigator.share === 'function';

  const bubbleClasses = isUser ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800 dark:bg-gray-700 dark:text-slate-200';
  const icon = isUser ? <UserIcon /> : <BotIcon />;

  const tableRegex = /((?:\|\s*.*?\s*\|(?:\r?\n|\r|$))+)/g;

  const contentParts = useMemo(() => {
    if (isUser || !message.text) {
      return [{ type: 'text', content: message.text }];
    }
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = tableRegex.exec(message.text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: message.text.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'table', content: match[0] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < message.text.length) {
      parts.push({ type: 'text', content: message.text.substring(lastIndex) });
    }
    return parts.length > 0 ? parts : [{ type: 'text', content: message.text }];
  }, [message.text, isUser]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const handleShare = async () => {
    if (showShareButton) {
      try {
        await navigator.share({ title: 'Pesan dari Asisten Guru AI', text: message.text });
      } catch (error) {
        console.error('Gagal membagikan:', error);
      }
    }
  };

  return (
    <div className={`group flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-md md:max-w-lg lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${bubbleClasses}`}
        >
          {contentParts.map((part, index) => {
            if (part.type === 'table') {
              return <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-2 my-2"><MarkdownTable tableString={part.content} /></div>;
            }
            return part.content.trim() ? <p key={index} className="whitespace-pre-wrap"><SimpleMarkdownRenderer text={part.content} /></p> : null;
          })}
        </div>
        <div className="flex items-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 mt-1">
           <button onClick={handleCopy} title={copyStatus === 'copied' ? 'Disalin!' : 'Salin Pesan'} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
              <CopyIcon />
          </button>
          {showShareButton && (
            <button onClick={handleShare} title="Bagikan" className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
              <ShareIcon />
            </button>
          )}
          <button onClick={onDelete} title="Hapus" className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-500">
            <DeleteIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
