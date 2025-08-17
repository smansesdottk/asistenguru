import React from 'react';
import type { ChatMessage } from '../types';
import { MessageRole } from '../types';
import UserIcon from './icons/UserIcon';
import BotIcon from './icons/BotIcon';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;

  const wrapperClasses = isUser
    ? 'flex justify-end items-start gap-3'
    : 'flex justify-start items-start gap-3';
  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white'
    : 'bg-slate-200 text-slate-800';
  const icon = isUser ? <UserIcon /> : <BotIcon />;

  return (
    <div className={wrapperClasses}>
      {!isUser && <div className="flex-shrink-0">{icon}</div>}
      <div
        className={`max-w-md md:max-w-lg lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${bubbleClasses}`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
      {isUser && <div className="flex-shrink-0">{icon}</div>}
    </div>
  );
};

export default ChatMessageBubble;