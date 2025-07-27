import React, { useState, useEffect } from 'react';
import { Activity, Clock, GitBranch, FileText, RefreshCw, Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { SyncStatus as SyncStatusType } from '../../types';

const SyncStatus: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await window.electronAPI.getSyncStatus();
      setSyncStatus(status);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSyncStatus();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSync = async () => {
    try {
      await window.electronAPI.syncSaves('manual');
      await loadSyncStatus();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-medieval text-3xl font-bold flame-text mb-2">Sync Status</h1>
          <p className="text-orange-300/80">
            Monitor your save file synchronization and repository status.
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-orange-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {syncStatus ? (
        <>
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="ember-border rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Activity className="w-6 h-6 text-orange-400" />
                <h3 className="font-semibold text-orange-200">Repository Status</h3>
              </div>
              <div className="space-y-2">
                <div className={`flex items-center space-x-2 ${syncStatus.hasChanges ? 'text-yellow-400' : 'text-green-400'}`}>
                  {syncStatus.hasChanges ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {syncStatus.hasChanges ? 'Changes Pending' : 'Up to Date'}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {syncStatus.hasChanges 
                    ? `${syncStatus.files.length} file(s) need syncing`
                    : 'All changes are synchronized'
                  }
                </p>
              </div>
            </div>

            <div className="ember-border rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Upload className="w-6 h-6 text-orange-400" />
                <h3 className="font-semibold text-orange-200">Local Ahead</h3>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-orange-300">{syncStatus.ahead}</p>
                <p className="text-sm text-gray-400">
                  {syncStatus.ahead === 0 
                    ? 'No unpushed commits'
                    : `Commit${syncStatus.ahead > 1 ? 's' : ''} to push`
                  }
                </p>
              </div>
            </div>

            <div className="ember-border rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Download className="w-6 h-6 text-orange-400" />
                <h3 className="font-semibold text-orange-200">Remote Ahead</h3>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-orange-300">{syncStatus.behind}</p>
                <p className="text-sm text-gray-400">
                  {syncStatus.behind === 0 
                    ? 'Up to date with remote'
                    : `Update${syncStatus.behind > 1 ? 's' : ''} available`
                  }
                </p>
              </div>
            </div>

            <div className="ember-border rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Clock className="w-6 h-6 text-orange-400" />
                <h3 className="font-semibold text-orange-200">Last Refresh</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-orange-300">
                  {lastRefresh?.toLocaleTimeString() || 'Never'}
                </p>
                <p className="text-sm text-gray-400">Status updated</p>
              </div>
            </div>
          </div>

          {/* Pending Changes */}
          {syncStatus.hasChanges && (
            <div className="ember-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <FileText className="w-6 h-6 text-orange-400" />
                  <h3 className="font-semibold text-orange-200">Pending Changes</h3>
                </div>
                <button
                  onClick={handleSync}
                  className="flex items-center space-x-2 px-4 py-2 bonfire-glow rounded-md text-orange-100 hover:shadow-lg transition-all duration-200"
                >
                  <Upload className="w-4 h-4" />
                  <span>Sync Now</span>
                </button>
              </div>
              
              <div className="space-y-2">
                {syncStatus.files.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 py-2 px-3 bg-gray-800/50 rounded">
                    <FileText className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-200 font-mono text-sm">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Commit Info */}
          {syncStatus.lastCommit && (
            <div className="ember-border rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <GitBranch className="w-6 h-6 text-orange-400" />
                <h3 className="font-semibold text-orange-200">Latest Commit</h3>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-orange-200 font-mono text-sm break-all">
                  {syncStatus.lastCommit}
                </p>
              </div>
            </div>
          )}

          {/* Sync Actions */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleSync}
              className="flex items-center space-x-2 px-6 py-3 bonfire-glow rounded-lg font-semibold text-orange-100 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200"
            >
              <Upload className="w-4 h-4" />
              <span>Manual Sync</span>
            </button>
          </div>
        </>
      ) : (
        /* Loading State */
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-orange-400 animate-spin mx-auto" />
            <p className="text-orange-300">Loading sync status...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatus;