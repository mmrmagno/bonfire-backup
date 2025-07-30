import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, X } from 'lucide-react';
import { UpdateStatus } from '../../types';

const UpdateNotification: React.FC = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ updateAvailable: false, updateDownloaded: false });
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    checkForUpdates();
    
    // Check for updates periodically (every 4 hours)
    const interval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    setCheckingForUpdates(true);
    try {
      await window.electronAPI.checkForUpdates();
      const status = await window.electronAPI.getUpdateStatus();
      setUpdateStatus(status);
      setLastChecked(new Date());
      
      if (status.updateAvailable && !status.updateDownloaded) {
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setCheckingForUpdates(false);
    }
  };

  const downloadUpdate = async () => {
    setDownloadingUpdate(true);
    try {
      await window.electronAPI.downloadUpdate();
      const status = await window.electronAPI.getUpdateStatus();
      setUpdateStatus(status);
    } catch (error) {
      console.error('Failed to download update:', error);
    } finally {
      setDownloadingUpdate(false);
    }
  };

  const installUpdate = async () => {
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  };

  if (!showNotification && !updateStatus.updateAvailable) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-orange-200 text-sm font-medium">Bonfire Backup is up to date</p>
            {lastChecked && (
              <p className="text-gray-400 text-xs">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={checkForUpdates}
          disabled={checkingForUpdates}
          className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-orange-200 transition-all duration-200 disabled:opacity-50 text-sm hover:shadow-md hover:shadow-orange-500/20"
        >
          {checkingForUpdates ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin-fast text-orange-400" />
              <span className="loading-dots">Checking</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 transition-transform hover:rotate-180 duration-300" />
              <span>Check for Updates</span>
            </>
          )}
        </button>
      </div>
    );
  }

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg shadow-xl border border-orange-500 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {updateStatus.updateDownloaded ? (
              <CheckCircle className="w-6 h-6 text-orange-100" />
            ) : (
              <Download className="w-6 h-6 text-orange-100" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-orange-100 font-semibold">
              {updateStatus.updateDownloaded ? 'Update Ready!' : 'Update Available!'}
            </h3>
            <p className="text-orange-100/80 text-sm mt-1">
              {updateStatus.updateDownloaded 
                ? 'A new version has been downloaded and is ready to install.'
                : 'A new version of Bonfire Backup is available for download.'
              }
            </p>
            
            <div className="flex space-x-2 mt-3">
              {updateStatus.updateDownloaded ? (
                <button
                  onClick={installUpdate}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded font-medium hover:bg-white transition-colors text-sm"
                >
                  Install Now
                </button>
              ) : (
                <button
                  onClick={downloadUpdate}
                  disabled={downloadingUpdate}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded font-medium hover:bg-white transition-all duration-200 disabled:opacity-50 text-sm flex items-center space-x-1 hover:shadow-lg hover:scale-105"
                >
                  {downloadingUpdate ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin-fast" />
                      <span className="loading-dots">Downloading</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 transition-transform hover:scale-110" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={() => setShowNotification(false)}
                className="px-3 py-1 bg-orange-800 text-orange-100 rounded hover:bg-orange-900 transition-colors text-sm"
              >
                Later
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowNotification(false)}
            className="flex-shrink-0 text-orange-100 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;