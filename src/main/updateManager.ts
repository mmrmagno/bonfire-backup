import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { EventEmitter } from 'events';

export class UpdateManager extends EventEmitter {
  private mainWindow: BrowserWindow;
  private updateAvailable = false;
  private updateDownloaded = false;

  constructor(mainWindow: BrowserWindow) {
    super();
    this.mainWindow = mainWindow;
    this.setupUpdater();
  }

  private setupUpdater() {
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Set GitHub repository for updates
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'mmrmagno',
      repo: 'bonfire-backup',
      private: false
    });

    // Enable checking for pre-releases (beta versions)
    autoUpdater.allowPrerelease = true;

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.emit('checking-for-update');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      this.updateAvailable = true;
      this.emit('update-available', info);
      this.notifyUpdateAvailable(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info.version);
      this.emit('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.emit('update-error', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(message);
      this.emit('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      this.updateDownloaded = true;
      this.emit('update-downloaded', info);
      this.notifyUpdateDownloaded(info);
    });
  }

  async checkForUpdates(): Promise<boolean> {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result !== null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return false;
    }
  }

  async downloadUpdate(): Promise<boolean> {
    if (!this.updateAvailable) {
      return false;
    }

    try {
      await autoUpdater.downloadUpdate();
      return true;
    } catch (error) {
      console.error('Failed to download update:', error);
      return false;
    }
  }

  async installUpdate(): Promise<void> {
    if (!this.updateDownloaded) {
      throw new Error('No update downloaded to install');
    }

    // This will quit the app and install the update
    autoUpdater.quitAndInstall();
  }

  private async notifyUpdateAvailable(info: any) {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Bonfire Backup ${info.version} is now available!`,
      detail: 'A new version of Bonfire Backup is ready to download. Would you like to download it now?',
      buttons: ['Download Now', 'Download Later', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1
    });

    switch (result.response) {
      case 0: // Download Now
        this.downloadUpdate();
        break;
      case 1: // Download Later
        // User will be notified again next time they start the app
        break;
      case 2: // Skip This Version
        // We could store this version to skip it in the future
        break;
    }
  }

  private async notifyUpdateDownloaded(info: any) {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready to Install',
      message: `Bonfire Backup ${info.version} has been downloaded!`,
      detail: 'The update has been downloaded and is ready to install. The application will restart to complete the installation.',
      buttons: ['Install Now', 'Install on Exit'],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      // Install immediately
      this.installUpdate();
    }
    // If response is 1, update will be installed when app quits
  }

  getUpdateStatus() {
    return {
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded
    };
  }
}