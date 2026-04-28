import React from 'react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange, disabled }) => {
  const models = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', desc: 'Penalaran Ultima (Terbaru)', icon: '🧠' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Kecepatan & Kecerdasan Terkini', icon: '⚡' },
    { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro', desc: 'Penalaran Kompleks', icon: '🏛️' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Paling Responsif & Stabil', icon: '⚖️' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Analisis Mendalam', icon: '📚' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Efisien & Cepat', icon: '🛡️' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 mb-8">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">
        Pilih Otak AI Guru
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onModelChange(model.id)}
            disabled={disabled}
            className={`flex flex-col items-center p-5 rounded-xl border-2 transition-all text-center group ${
              selectedModel === model.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-slate-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">
              {model.icon}
            </span>
            <span className="font-bold text-base text-slate-900 dark:text-slate-100">
              {model.name}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest font-medium">
              {model.desc}
            </span>
            {selectedModel === model.id && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Terpilih</span>
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8 italic font-medium">
        * Model dapat diubah kembali saat memulai chat baru. Gunakan Gemini 3.1 untuk teknologi terbaru.
      </p>
    </div>
  );
};

export default ModelSelector;
