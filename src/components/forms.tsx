import React from 'react';

export const FormRow: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

export const MultiSelectButtons: React.FC<{ options: string[]; selected: string[]; onChange: (newSelection: string[]) => void; }> = ({ options, selected, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(option => (
      <button
        key={option}
        type="button"
        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${selected.includes(option) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
        onClick={() => {
          const newSelection = selected.includes(option)
            ? selected.filter(s => s !== option)
            : [...selected, option];
          onChange(newSelection);
        }}
      >
        {option}
      </button>
    ))}
  </div>
);
