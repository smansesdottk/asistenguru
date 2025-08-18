import React from 'react';

interface PromptStartersProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  isLoading: boolean;
}

const PromptStarters: React.FC<PromptStartersProps> = ({ prompts, onSelectPrompt, isLoading }) => {
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto p-4">
        <h2 className="text-center text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Mencari ide untuk Anda...</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h2 className="text-center text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Coba tanyakan:</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(prompt)}
            className="p-4 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PromptStarters;
