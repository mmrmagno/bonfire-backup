import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script loading...');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key: string, value: string | boolean) => ipcRenderer.invoke('set-config', key, value),
  detectSavePath: () => ipcRenderer.invoke('detect-save-path'),
  selectSavePath: () => ipcRenderer.invoke('select-save-path'),
  initGitRepo: (repoUrl: string) => ipcRenderer.invoke('init-git-repo', repoUrl),
  syncSaves: (mode: 'manual' | 'auto') => ipcRenderer.invoke('sync-saves', mode),
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
  restoreSaves: () => ipcRenderer.invoke('restore-saves'),
  getBackupInfo: () => ipcRenderer.invoke('get-backup-info'),
  pullFromRemote: () => ipcRenderer.invoke('pull-from-remote'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
});

console.log('Preload script completed, electronAPI exposed');