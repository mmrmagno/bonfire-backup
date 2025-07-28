import React from 'react';
import { Minimize, Maximize, X, Flame } from 'lucide-react';

const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <div className="h-8 bg-gray-800 border-b border-orange-500/20 flex items-center justify-between px-4 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center space-x-2">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-orange-200">Bonfire Backup</span>
      </div>
      
      <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
        >
          <Minimize className="w-3 h-3 text-orange-300" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
        >
          <Maximize className="w-3 h-3 text-orange-300" />
        </button>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-600 transition-colors"
        >
          <X className="w-3 h-3 text-orange-300 hover:text-white" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;