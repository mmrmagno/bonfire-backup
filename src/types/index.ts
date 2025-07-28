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