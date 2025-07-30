export interface ElectronAPI {
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: any) => Promise<boolean>;
  detectSavePath: () => Promise<string | null>;
  selectSavePath: () => Promise<string | null>;
  initGitRepo: (repoUrl: string) => Promise<boolean>;
  syncSaves: (mode: 'manual' | 'auto') => Promise<boolean>;
  getSyncStatus: () => Promise<SyncStatus>;
  restoreSaves: () => Promise<boolean>;
  getBackupInfo: () => Promise<BackupInfo>;
  pullFromRemote: () => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  
  // Update functionality
  checkForUpdates: () => Promise<boolean>;
  downloadUpdate: () => Promise<boolean>;
  installUpdate: () => Promise<void>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  
  // GitHub OAuth functionality
  startGitHubAuth: () => Promise<{ userCode: string; verificationUri: string; deviceCode: string; interval: number }>;
  completeGitHubAuth: (deviceCode: string, interval: number) => Promise<boolean>;
  createGitHubRepo: (repoName: string, isPrivate: boolean) => Promise<string>;
  listGitHubRepos: () => Promise<Array<{ name: string; clone_url: string; private: boolean }>>;
  getAuthStatus: () => Promise<{ authenticated: boolean; user?: GitHubUser }>;
  logoutGitHub: () => Promise<boolean>;
  
  // App info
  getAppVersion: () => Promise<string>;
}

export interface SyncStatus {
  hasChanges: boolean;
  ahead: number;
  behind: number;
  files: string[];
  lastCommit?: string;
}

export interface BackupInfo {
  hasBackup: boolean;
  fileCount: number;
  lastBackup?: string;
  files: string[];
}

export interface UpdateStatus {
  updateAvailable: boolean;
  updateDownloaded: boolean;
}

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
}

export interface AppConfig {
  savePath?: string;
  backupPath?: string;
  repoUrl?: string;
  autoSync?: boolean;
  syncInterval?: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}