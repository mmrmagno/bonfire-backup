import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import Store from 'electron-store';
import { SaveFileManager } from './saveFileManager';
import { GitManager } from './gitManager';

const store = new Store();
let mainWindow: BrowserWindow;
let saveFileManager: SaveFileManager;
let gitManager: GitManager;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#111827',
    icon: path.join(__dirname, '../../assets/bonfire.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  
  saveFileManager = new SaveFileManager();
  gitManager = new GitManager();

  // Set up auto-sync if enabled
  setupAutoSync();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let autoSyncInterval: NodeJS.Timeout | null = null;

function setupAutoSync() {
  const config = store.store;
  if (config.autoSync && config.savePath) {
    const interval = (config.syncInterval || 5) * 60 * 1000; // Convert minutes to ms
    
    saveFileManager.startWatching(config.savePath, async () => {
      // Debounce rapid file changes
      if (autoSyncInterval) {
        clearTimeout(autoSyncInterval);
      }
      
      autoSyncInterval = setTimeout(async () => {
        try {
          await saveFileManager.syncSaves(config.savePath, config.backupPath || path.join(os.homedir(), '.bonfire-backup'), 'auto');
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

ipcMain.handle('set-config', (_, key: string, value: any) => {
  store.set(key, value);
  
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
  const savePath = store.get('savePath') as string;
  const backupPath = store.get('backupPath') as string || path.join(os.homedir(), '.bonfire-backup');
  
  return await gitManager.initializeRepository(backupPath, repoUrl);
});

ipcMain.handle('sync-saves', async (_, mode: 'manual' | 'auto') => {
  const savePath = store.get('savePath') as string;
  const backupPath = store.get('backupPath') as string || path.join(os.homedir(), '.bonfire-backup');
  
  if (!savePath) {
    throw new Error('Save path not configured');
  }
  
  const syncSuccess = await saveFileManager.syncSaves(savePath, backupPath, mode);
  if (syncSuccess) {
    await gitManager.commitAndPush(`${mode === 'manual' ? 'Manual' : 'Automatic'} save backup`);
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