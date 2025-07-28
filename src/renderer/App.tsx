import { useState, useEffect } from 'react';
import { Flame, Settings, Activity } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Configuration from './components/Configuration';
import SyncStatus from './components/SyncStatus';
import TitleBar from './components/TitleBar';

type Tab = 'dashboard' | 'configuration' | 'sync';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('App starting, electronAPI available:', !!window.electronAPI);
        console.log('window object keys:', Object.keys(window));
        
        // Wait a bit for preload to load if not immediately available
        if (!window.electronAPI) {
          console.log('ElectronAPI not immediately available, waiting...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!window.electronAPI) {
          console.error('Electron API not available after waiting');
          setIsLoading(false);
          return;
        }
        console.log('Checking configuration...');
        await checkConfiguration();
        console.log('App initialized successfully');
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-orange-100 relative overflow-hidden">
        {/* Dark Souls inspired loading animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
        
        {/* Floating embers */}
        <div className="absolute inset-0">
          <div className="ember floating-ember-1"></div>
          <div className="ember floating-ember-2"></div>
          <div className="ember floating-ember-3"></div>
          <div className="ember floating-ember-4"></div>
          <div className="ember floating-ember-5"></div>
        </div>
        
        <div className="text-center z-10">
          {/* Animated bonfire */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto relative">
              <Flame className="w-full h-full text-orange-500 animate-pulse" />
              <div className="absolute inset-0 w-full h-full">
                <Flame className="w-full h-full text-yellow-400 animate-ping opacity-75" />
              </div>
              <div className="absolute inset-2 w-20 h-20">
                <Flame className="w-full h-full text-red-500 animate-bounce" />
              </div>
            </div>
            <div className="mt-4 w-32 h-2 mx-auto bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-600 to-yellow-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="font-medieval text-3xl font-bold flame-text mb-4">Bonfire Backup</h1>
          <p className="text-orange-300 animate-pulse">Kindling the flame...</p>
          <p className="text-sm text-gray-400 mt-2">Linking your Dark Souls III saves</p>
        </div>
      </div>
    );
  }

  if (!window.electronAPI) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-orange-100">
        <div className="text-center">
          <Flame className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h1 className="font-medieval text-2xl font-bold flame-text mb-4">Bonfire Backup</h1>
          <p className="text-lg text-red-400 mb-2">Electron API not available</p>
          <p className="text-sm text-gray-400 mb-4">Please run in Electron environment</p>
          <div className="text-xs text-gray-500">
            <p>Debug: Running in browser mode</p>
            <p>Use: npx electron . to run properly</p>
          </div>
        </div>
      </div>
    );
  }

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