import React, { useState, useEffect } from 'react';
import { Flame, Settings, Activity, Minimize, Maximize, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Configuration from './components/Configuration';
import SyncStatus from './components/SyncStatus';
import TitleBar from './components/TitleBar';

type Tab = 'dashboard' | 'configuration' | 'sync';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const config = await window.electronAPI.getConfig();
      setIsConfigured(config.savePath && config.repoUrl);
    } catch (error) {
      console.error('Failed to check configuration:', error);
    }
  };

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Bonfire', icon: Flame },
    { id: 'configuration' as Tab, label: 'Configuration', icon: Settings },
    { id: 'sync' as Tab, label: 'Sync Status', icon: Activity },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-orange-100 overflow-hidden">
      <TitleBar />
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 ash-bg border-r border-orange-500/20 flex flex-col">
          {/* Logo Section */}
          <div className="p-6 border-b border-orange-500/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bonfire-glow rounded-lg">
                <Flame className="w-6 h-6 text-orange-100" />
              </div>
              <div>
                <h1 className="font-medieval text-lg font-bold flame-text">Bonfire Backup</h1>
                <p className="text-xs text-orange-300/70">Dark Souls III Save Sync</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bonfire-glow text-orange-100 shadow-lg' 
                      : 'hover:bg-gray-800/50 text-orange-200/70 hover:text-orange-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-orange-100' : 'text-orange-400'}`} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Status Indicator */}
          <div className="p-4 border-t border-orange-500/20">
            <div className={`flex items-center space-x-2 text-sm ${
              isConfigured ? 'text-green-400' : 'text-yellow-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-yellow-400 shadow-lg shadow-yellow-400/50'
              }`} />
              <span>{isConfigured ? 'Configured' : 'Setup Required'}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {activeTab === 'dashboard' && <Dashboard onConfigurationChange={checkConfiguration} />}
            {activeTab === 'configuration' && <Configuration onConfigurationChange={checkConfiguration} />}
            {activeTab === 'sync' && <SyncStatus />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;