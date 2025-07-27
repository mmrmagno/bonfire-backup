import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('set-config', key, value),
  detectSavePath: () => ipcRenderer.invoke('detect-save-path'),
  selectSavePath: () => ipcRenderer.invoke('select-save-path'),
  initGitRepo: (repoUrl: string) => ipcRenderer.invoke('init-git-repo', repoUrl),
  syncSaves: (mode: 'manual' | 'auto') => ipcRenderer.invoke('sync-saves', mode),
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
});