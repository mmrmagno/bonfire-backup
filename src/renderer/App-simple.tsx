import React, { useState } from 'react';
import { Flame, Settings, Activity } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#111827',
      color: '#fed7aa',
      overflow: 'hidden'
    }}>
      {/* Title Bar */}
      <div className="h-8 bg-gray-800 border-b border-orange-500/20 flex items-center justify-between px-4 select-none">
        <div className="flex items-center space-x-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-orange-200">Bonfire Backup</span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-orange-500/20 flex flex-col">
          <div className="p-6 border-b border-orange-500/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-600 rounded-lg">
                <Flame className="w-6 h-6 text-orange-100" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-orange-400">Bonfire Backup</h1>
                <p className="text-xs text-orange-300/70">Dark Souls III Save Sync</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: 'dashboard', label: 'Bonfire', icon: Flame },
              { id: 'configuration', label: 'Configuration', icon: Settings },
              { id: 'sync', label: 'Sync Status', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-orange-600 text-orange-100 shadow-lg' 
                      : 'hover:bg-gray-700 text-orange-200/70 hover:text-orange-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-orange-100' : 'text-orange-400'}`} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 rounded-full mb-4">
                <Flame className="w-10 h-10 text-orange-100" />
              </div>
              <h1 className="text-4xl font-bold text-orange-400">Bonfire Backup</h1>
              <p className="text-orange-300/80 text-lg max-w-2xl mx-auto">
                Keep your Dark Souls III save files safe across the void. Never lose your progress to the abyss again.
              </p>
              
              {/* Test ElectronAPI */}
              <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-200 mb-2">System Status</h3>
                <p className="text-green-400">
                  ✅ Electron API: {window.electronAPI ? 'Available' : 'Not Available'}
                </p>
                <p className="text-green-400">
                  ✅ React: Working
                </p>
                <p className="text-green-400">
                  ✅ UI: Loaded Successfully
                </p>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => alert('Basic functionality working!')}
                  className="px-8 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold text-orange-100 transition-all duration-200"
                >
                  🔥 Test Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;