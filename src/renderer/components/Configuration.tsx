import React, { useState, useEffect } from 'react';
import { Folder, GitBranch, Settings, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { AppConfig } from '../../types';

interface ConfigurationProps {
  onConfigurationChange: () => void;
}

const Configuration: React.FC<ConfigurationProps> = ({ onConfigurationChange }) => {
  const [config, setConfig] = useState<AppConfig>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [detectStatus, setDetectStatus] = useState<'idle' | 'detecting' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const loadedConfig = await window.electronAPI.getConfig();
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleDetectSavePath = async () => {
    setDetectStatus('detecting');
    try {
      const detectedPath = await window.electronAPI.detectSavePath();
      if (detectedPath) {
        setConfig(prev => ({ ...prev, savePath: detectedPath }));
        setDetectStatus('success');
      } else {
        setDetectStatus('error');
      }
    } catch (error) {
      setDetectStatus('error');
      console.error('Detection failed:', error);
    }
  };

  const handleSelectSavePath = async () => {
    try {
      const selectedPath = await window.electronAPI.selectSavePath();
      if (selectedPath) {
        setConfig(prev => ({ ...prev, savePath: selectedPath }));
      }
    } catch (error) {
      console.error('Path selection failed:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaveStatus('saving');
    try {
      // Save all config values
      await Promise.all([
        window.electronAPI.setConfig('savePath', config.savePath),
        window.electronAPI.setConfig('repoUrl', config.repoUrl),
        window.electronAPI.setConfig('autoSync', config.autoSync),
        window.electronAPI.setConfig('syncInterval', config.syncInterval),
        window.electronAPI.setConfig('backupPath', config.backupPath)
      ]);

      // Initialize git repo if URL is provided
      if (config.repoUrl) {
        await window.electronAPI.initGitRepo(config.repoUrl);
      }

      setSaveStatus('success');
      onConfigurationChange();
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Failed to save config:', error);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateConfig = (key: keyof AppConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-medieval text-3xl font-bold flame-text mb-2">Configuration</h1>
        <p className="text-orange-300/80">
          Configure your save file paths and backup settings to protect your Dark Souls III progress.
        </p>
      </div>

      {/* Save File Path Section */}
      <div className="ember-border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Folder className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-semibold text-orange-200">Dark Souls III Save Path</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-orange-300 mb-2">
              Save File Directory
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={config.savePath || ''}
                onChange={(e) => updateConfig('savePath', e.target.value)}
                placeholder="Path to Dark Souls III save files..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-orange-100 placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={handleSelectSavePath}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-orange-200 transition-colors"
              >
                Browse
              </button>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleDetectSavePath}
              disabled={detectStatus === 'detecting'}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md text-orange-100 transition-colors disabled:opacity-50"
            >
              {detectStatus === 'detecting' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Auto-Detect</span>
            </button>
            
            {detectStatus === 'success' && (
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Save path detected!</span>
              </div>
            )}
            
            {detectStatus === 'error' && (
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Could not detect save path</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Git Repository Section */}
      <div className="ember-border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <GitBranch className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-semibold text-orange-200">Git Repository</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-orange-300 mb-2">
              Repository URL
            </label>
            <input
              type="text"
              value={config.repoUrl || ''}
              onChange={(e) => updateConfig('repoUrl', e.target.value)}
              placeholder="https://github.com/username/ds3-saves.git"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-orange-100 placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
            <p className="text-sm text-gray-400 mt-1">
              Git repository URL where your save files will be backed up
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-orange-300 mb-2">
              Backup Directory (Optional)
            </label>
            <input
              type="text"
              value={config.backupPath || ''}
              onChange={(e) => updateConfig('backupPath', e.target.value)}
              placeholder="Leave empty for default (~/.bonfire-backup)"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-orange-100 placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Sync Settings Section */}
      <div className="ember-border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-semibold text-orange-200">Sync Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoSync"
              checked={config.autoSync || false}
              onChange={(e) => updateConfig('autoSync', e.target.checked)}
              className="w-4 h-4 text-orange-600 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
            />
            <label htmlFor="autoSync" className="text-orange-200">
              Enable automatic synchronization
            </label>
          </div>

          {config.autoSync && (
            <div>
              <label className="block text-sm font-medium text-orange-300 mb-2">
                Sync Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.syncInterval || 5}
                onChange={(e) => updateConfig('syncInterval', parseInt(e.target.value))}
                className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-orange-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSaveConfig}
          disabled={saveStatus === 'saving' || !config.savePath || !config.repoUrl}
          className="flex items-center space-x-2 px-8 py-3 bonfire-glow rounded-lg font-semibold text-orange-100 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveStatus === 'saving' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : saveStatus === 'success' ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Saved!</span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>Error</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Configuration;