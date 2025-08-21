import React from 'react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange, disabled }) => {
  return (
    <div className="w-full max-w-md mx-auto p-4">
      <label htmlFor="ai-model-selector" className="block text-sm font-medium text-center text-slate-700 dark:text-slate-300 mb-2">
        Pilih Model AI
      </label>
      <select
        id="ai-model-selector"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled}
        className="block w-full py-2 px-3 border border-slate-300 bg-white dark:bg-gray-800 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 dark:text-slate-200"
      >
        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Cepat &amp; Cerdas)</option>
        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Paling Canggih)</option>
        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
      </select>
       <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
        Model 2.5 Flash direkomendasikan untuk analisis data besar.
      </p>
    </div>
  );
};

export default ModelSelector;
