import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script loading...');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('set-config', key, value),
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
  
  // Update functionality
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  
  // GitHub OAuth functionality
  startGitHubAuth: () => ipcRenderer.invoke('start-github-auth'),
  completeGitHubAuth: (deviceCode: string, interval: number) => ipcRenderer.invoke('complete-github-auth', deviceCode, interval),
  createGitHubRepo: (repoName: string, isPrivate: boolean) => ipcRenderer.invoke('create-github-repo', repoName, isPrivate),
  listGitHubRepos: () => ipcRenderer.invoke('list-github-repos'),
  getAuthStatus: () => ipcRenderer.invoke('get-auth-status'),
  logoutGitHub: () => ipcRenderer.invoke('logout-github'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});

console.log('Preload script completed, electronAPI exposed');