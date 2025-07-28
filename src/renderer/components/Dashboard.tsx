import React, { useState, useEffect } from 'react';
import { Shield, Upload, Download, Clock, AlertTriangle, CheckCircle, Flame, RotateCcw, Cloud } from 'lucide-react';
import { AppConfig, SyncStatus, BackupInfo } from '../../types';

interface DashboardProps {
  onConfigurationChange: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onConfigurationChange }) => {
  const [config, setConfig] = useState<AppConfig>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        await loadConfig();
        await loadSyncStatus();
        await loadBackupInfo();
      } catch (error) {
        console.error('Dashboard initialization failed:', error);
      }
    };
    initDashboard();
  }, []);

  const loadConfig = async () => {
    try {
      const loadedConfig = await window.electronAPI.getConfig();
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await window.electronAPI.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const loadBackupInfo = async () => {
    try {
      const info = await window.electronAPI.getBackupInfo();
      setBackupInfo(info);
    } catch (error) {
      console.error('Failed to load backup info:', error);
    }
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      const success = await window.electronAPI.syncSaves('manual');
      if (success) {
        setLastSync(new Date());
        await loadSyncStatus();
        await loadBackupInfo();
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('⚠️ This will overwrite your current save files with the backed up versions. Your current saves will be backed up first. Continue?')) {
      return;
    }
    
    setIsRestoring(true);
    try {
      const success = await window.electronAPI.restoreSaves();
      if (success) {
        alert('✅ Save files restored successfully! Your previous saves were backed up.');
        await loadBackupInfo();
      } else {
        alert('❌ Failed to restore save files.');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      alert('❌ Restore failed: ' + (error as Error).message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePullFromRemote = async () => {
    setIsPulling(true);
    try {
      const success = await window.electronAPI.pullFromRemote();
      if (success) {
        await loadSyncStatus();
        await loadBackupInfo();
      }
    } catch (error) {
      console.error('Pull failed:', error);
    } finally {
      setIsPulling(false);
    }
  };

  const isConfigured = config.savePath && config.repoUrl;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bonfire-glow rounded-full mb-4">
          <Flame className="w-10 h-10 text-orange-100" />
        </div>
        <h1 className="font-medieval text-4xl font-bold flame-text">Bonfire Backup</h1>
        <p className="text-orange-300/80 text-lg max-w-2xl mx-auto">
          Keep your Dark Souls III save files safe across the void. Never lose your progress to the abyss again.
        </p>
      </div>

      {/* Configuration Warning */}
      {!isConfigured && (
        <div className="ember-border rounded-lg p-6 bg-yellow-900/20 border-yellow-500/30">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <div>
              <h3 className="font-semibold text-yellow-200">Configuration Required</h3>
              <p className="text-yellow-300/80 mt-1">
                Please configure your save file path and repository URL in the Configuration tab to begin protecting your saves.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="ember-border rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="w-6 h-6 text-orange-400" />
            <h3 className="font-semibold text-orange-200">Protection Status</h3>
          </div>
          <div className="space-y-2">
            <div className={`flex items-center space-x-2 ${isConfigured ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm">{isConfigured ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="text-sm text-gray-400">
              {isConfigured ? 'Your saves are being monitored' : 'Setup required to protect saves'}
            </p>
          </div>
        </div>

        <div className="ember-border rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Clock className="w-6 h-6 text-orange-400" />
            <h3 className="font-semibold text-orange-200">Last Backup</h3>
          </div>
          <div className="space-y-2">
            {backupInfo?.lastBackup ? (
              <>
                <p className="text-sm text-green-400">{new Date(backupInfo.lastBackup).toLocaleString()}</p>
                <p className="text-sm text-gray-400">{backupInfo.fileCount} file(s) backed up</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">No backup yet</p>
                <p className="text-sm text-gray-500">Perform your first backup</p>
              </>
            )}
          </div>
        </div>

        <div className="ember-border rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Upload className="w-6 h-6 text-orange-400" />
            <h3 className="font-semibold text-orange-200">Sync Mode</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-orange-300">
              {config.autoSync ? 'Automatic' : 'Manual'}
            </p>
            <p className="text-sm text-gray-400">
              {config.autoSync ? 'Changes synced automatically' : 'Manual sync required'}
            </p>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {isConfigured && syncStatus && (
        <div className="ember-border rounded-lg p-6">
          <h3 className="font-semibold text-orange-200 mb-4 flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Repository Status</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-400">Pending Changes</p>
              <p className={`text-lg font-semibold ${syncStatus.hasChanges ? 'text-yellow-400' : 'text-green-400'}`}>
                {syncStatus.files.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Ahead</p>
              <p className="text-lg font-semibold text-orange-300">{syncStatus.ahead}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Behind</p>
              <p className="text-lg font-semibold text-orange-300">{syncStatus.behind}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Synced</span>
              </div>
            </div>
          </div>
          {syncStatus.lastCommit && (
            <div className="mt-4 pt-4 border-t border-orange-500/20">
              <p className="text-sm text-gray-400">Last Commit</p>
              <p className="text-sm text-orange-300 truncate">{syncStatus.lastCommit}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isConfigured && (
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleManualSync}
            disabled={isLoading}
            className="px-6 py-3 bonfire-glow rounded-lg font-semibold text-orange-100 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                <span>Syncing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Backup Now</span>
              </div>
            )}
          </button>

          <button
            onClick={handlePullFromRemote}
            disabled={isPulling}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPulling ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                <span>Pulling...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Cloud className="w-4 h-4" />
                <span>Pull Latest</span>
              </div>
            )}
          </button>

          {backupInfo?.hasBackup && (
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold text-yellow-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRestoring ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin" />
                  <span>Restoring...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4" />
                  <span>Restore Saves</span>
                </div>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;