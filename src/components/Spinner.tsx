import React from 'react';

export const Spinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <div
      className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);
