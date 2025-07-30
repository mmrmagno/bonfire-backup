import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import Store from 'electron-store';
import { SaveFileManager } from './saveFileManager';
import { GitManager } from './gitManager';
import { UpdateManager } from './updateManager';
import { AuthManager } from './authManager';

const store = new Store();
let mainWindow: BrowserWindow;
let saveFileManager: SaveFileManager;
let gitManager: GitManager;
let updateManager: UpdateManager;
let authManager: AuthManager;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#111827',
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // For development
    },
  });

  console.log('Preload path:', path.join(__dirname, 'preload.js'));

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // Try different ports that Vite might use
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    console.log('Loading dev URL:', devUrl);
    
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
    
    // Debug URL loading
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page loaded successfully');
      // Show window once content is loaded
      setTimeout(() => {
        mainWindow.show();
        mainWindow.focus();
      }, 100);
    });

    mainWindow.webContents.on('dom-ready', () => {
      console.log('DOM ready');
    });
  } else {
    const rendererPath = path.join(__dirname, 'renderer/index.html');
    mainWindow.loadFile(rendererPath);
  }
}

app.whenReady().then(() => {
  createWindow();
  
  saveFileManager = new SaveFileManager();
  gitManager = new GitManager();
  updateManager = new UpdateManager(mainWindow);
  authManager = new AuthManager(mainWindow, store);

  // Set up auto-sync if enabled
  setupAutoSync();

  // Check for updates on startup (after 5 seconds)
  setTimeout(() => {
    updateManager.checkForUpdates();
  }, 5000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let autoSyncInterval: NodeJS.Timeout | null = null;

function setupAutoSync() {
  const config = store.store as Record<string, unknown>;
  if (config.autoSync && config.savePath) {
    
    saveFileManager.startWatching(config.savePath as string, async () => {
      // Debounce rapid file changes
      if (autoSyncInterval) {
        clearTimeout(autoSyncInterval);
      }
      
      autoSyncInterval = setTimeout(async () => {
        try {
          // Ensure GitManager has the latest token for auto-sync
          const token = authManager.getStoredToken();
          if (token) {
            gitManager.setToken(token);
          }
          
          await saveFileManager.syncSaves(
            config.savePath as string, 
            (config.backupPath as string) || path.join(os.homedir(), '.bonfire-backup'), 
            'auto'
          );
          await gitManager.commitAndPush('Automatic save backup');
          
          // Notify renderer
          if (mainWindow) {
            mainWindow.webContents.send('auto-sync-completed');
          }
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }, 2000); // Wait 2 seconds after last change
    });
  }
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('get-config', () => {
  return store.store;
});

ipcMain.handle('set-config', (_, key: string, value: unknown) => {
  // Handle null/undefined values properly for electron-store
  if (value === null || value === undefined || value === '') {
    if (store.has(key)) {
      store.delete(key);
    }
  } else {
    store.set(key, value);
  }
  
  // Restart auto-sync if config changed
  if (key === 'autoSync' || key === 'savePath' || key === 'syncInterval') {
    saveFileManager.stopWatching();
    setupAutoSync();
  }
  
  return true;
});

ipcMain.handle('detect-save-path', async () => {
  return await saveFileManager.detectSavePath();
});

ipcMain.handle('select-save-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Dark Souls III Save Directory'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    if (await saveFileManager.validateSavePath(selectedPath)) {
      store.set('savePath', selectedPath);
      return selectedPath;
    } else {
      throw new Error('Invalid Dark Souls III save directory');
    }
  }
  return null;
});

ipcMain.handle('init-git-repo', async (_, repoUrl: string) => {
  const backupPath = store.get('backupPath') as string || path.join(os.homedir(), '.bonfire-backup');
  
  // Set GitHub token if available
  const token = authManager.getStoredToken();
  if (token) {
    gitManager.setToken(token);
  }
  
  return await gitManager.initializeRepository(backupPath, repoUrl);
});

ipcMain.handle('sync-saves', async (_, mode: 'manual' | 'auto') => {
  const savePath = store.get('savePath') as string;
  const backupPath = store.get('backupPath') as string || path.join(os.homedir(), '.bonfire-backup');
  const repoUrl = store.get('repoUrl') as string;
  
  if (!savePath) {
    throw new Error('Save path not configured');
  }
  
  // Set GitHub token if available
  const token = authManager.getStoredToken();
  if (token) {
    gitManager.setToken(token);
  }
  
  // Initialize git repository if not already done
  const initResult = await gitManager.initializeRepository(backupPath, repoUrl);
  if (!initResult && repoUrl) {
    throw new Error('Failed to initialize git repository. Check your repository URL and branch settings.');
  }
  
  const syncSuccess = await saveFileManager.syncSaves(savePath, backupPath, mode);
  if (syncSuccess) {
    const commitResult = await gitManager.commitAndPush(`${mode === 'manual' ? 'Manual' : 'Automatic'} save backup`);
    if (!commitResult && repoUrl) {
      throw new Error('Save files backed up locally, but failed to sync with remote repository. Check your repository URL and branch settings.');
    }
  }
  
  return syncSuccess;
});

ipcMain.handle('get-sync-status', async () => {
  return await gitManager.getStatus();
});

ipcMain.handle('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow.close();
});

ipcMain.handle('restore-saves', async () => {
  const savePath = store.get('savePath') as string;
  const backupPath = store.get('backupPath') as string || path.join(os.homedir(), '.bonfire-backup');
  
  if (!savePath) {
    throw new Error('Save path not configured');
  }
  
  return await saveFileManager.restoreSaves(backupPath, savePath);
});

ipcMain.handle('get-backup-info', async () => {
  const backupPath = store.get('backupPath') as string || path.join(os.homedir(), '.bonfire-backup');
  return await saveFileManager.getBackupInfo(backupPath);
});

ipcMain.handle('pull-from-remote', async () => {
  return await gitManager.syncWithRemote();
});

// Update management handlers
ipcMain.handle('check-for-updates', async () => {
  return await updateManager.checkForUpdates();
});

ipcMain.handle('download-update', async () => {
  return await updateManager.downloadUpdate();
});

ipcMain.handle('install-update', async () => {
  await updateManager.installUpdate();
});

ipcMain.handle('get-update-status', () => {
  return updateManager.getUpdateStatus();
});

// GitHub OAuth handlers
ipcMain.handle('start-github-auth', async () => {
  return await authManager.startGitHubAuth();
});

ipcMain.handle('complete-github-auth', async (_, deviceCode: string, interval: number) => {
  return await authManager.completeGitHubAuth(deviceCode, interval);
});

ipcMain.handle('create-github-repo', async (_, repoName: string, isPrivate: boolean) => {
  return await authManager.createRepository(repoName, isPrivate);
});

ipcMain.handle('list-github-repos', async () => {
  return await authManager.listRepositories();
});

ipcMain.handle('get-auth-status', () => {
  return authManager.getAuthStatus();
});

ipcMain.handle('logout-github', () => {
  authManager.logout();
  return true;
});

// App info handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});