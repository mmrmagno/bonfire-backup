import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as chokidar from 'chokidar';

export class SaveFileManager {
  private watcher?: chokidar.FSWatcher;

  async detectSavePath(): Promise<string | null> {
    const platform = os.platform();
    let possiblePaths: string[] = [];

    if (platform === 'win32') {
      const userName = process.env.USERNAME || 'User';
      possiblePaths = [
        path.join('C:', 'Users', userName, 'AppData', 'Roaming', 'DarkSoulsIII'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'DarkSoulsIII'),
        path.join(os.homedir(), 'Documents', 'NBGI', 'DARK SOULS III'),
      ];
    } else if (platform === 'linux') {
      // Steam Proton paths for Dark Souls III
      const steamCompatPath = path.join(os.homedir(), '.steam', 'steamapps', 'compatdata', '374320', 'pfx', 'drive_c', 'users', 'steamuser', 'Application Data', 'Dark Souls III');
      
      possiblePaths = [
        steamCompatPath,
        // Legacy Steam paths
        path.join(os.homedir(), '.steam', 'steam', 'userdata'),
        path.join(os.homedir(), '.local', 'share', 'Steam', 'userdata'),
        path.join(os.homedir(), 'Games', 'dark-souls-3', 'saves')
      ];
      
      // Check for subdirectories in the Steam compat path
      try {
        const compatExists = await fs.stat(steamCompatPath);
        if (compatExists.isDirectory()) {
          const subDirs = await fs.readdir(steamCompatPath);
          for (const subDir of subDirs) {
            possiblePaths.push(path.join(steamCompatPath, subDir));
          }
        }
      } catch (error) {
        // Directory doesn't exist, continue with other paths
      }
      
      // Also check traditional Steam userdata paths
      try {
        const steamPath = path.join(os.homedir(), '.steam', 'steam', 'userdata');
        const userDirs = await fs.readdir(steamPath);
        for (const userDir of userDirs) {
          if (!isNaN(Number(userDir))) {
            possiblePaths.push(
              path.join(steamPath, userDir, '374320', 'remote')
            );
          }
        }
      } catch (error) {
        // Steam userdata not found
      }
    }

    for (const possiblePath of possiblePaths) {
      if (await this.validateSavePath(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }

  async validateSavePath(savePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(savePath);
      if (!stats.isDirectory()) return false;

      const files = await fs.readdir(savePath);
      
      // Check for Dark Souls III save file patterns or test files
      const hasSaveFiles = files.some(file => 
        file.endsWith('.sl2') || 
        file.includes('DS30000') ||
        file.includes('DRAKS0005') ||
        (file.toLowerCase().includes('test') && file.endsWith('.sl2')) ||
        file.toLowerCase().includes('test') && file.endsWith('.sl2')
      );

      return hasSaveFiles;
    } catch (error) {
      return false;
    }
  }

  async syncSaves(savePath: string, backupPath: string, mode: 'manual' | 'auto'): Promise<boolean> {
    try {
      // Ensure backup directory exists
      await fs.mkdir(backupPath, { recursive: true });

      // Copy save files to backup location
      const files = await fs.readdir(savePath);
      const saveFiles = files.filter(file => 
        file.endsWith('.sl2') || 
        file.includes('DS30000') ||
        file.includes('DRAKS0005') ||
        (file.toLowerCase().includes('test') && file.endsWith('.sl2'))
      );

      for (const file of saveFiles) {
        const sourcePath = path.join(savePath, file);
        const destPath = path.join(backupPath, file);
        await fs.copyFile(sourcePath, destPath);
      }

      // Add timestamp info
      const syncInfo = {
        timestamp: new Date().toISOString(),
        mode,
        filesCount: saveFiles.length,
        files: saveFiles
      };
      
      await fs.writeFile(
        path.join(backupPath, 'sync-info.json'),
        JSON.stringify(syncInfo, null, 2)
      );

      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  }

  startWatching(savePath: string, callback: () => void): void {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = chokidar.watch(savePath, {
      ignored: /[\/\\]\./,
      persistent: true,
      ignoreInitial: true
    });

    this.watcher.on('change', callback);
    this.watcher.on('add', callback);
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }

  async restoreSaves(backupPath: string, savePath: string): Promise<boolean> {
    try {
      // Check if backup directory exists
      const backupStats = await fs.stat(backupPath);
      if (!backupStats.isDirectory()) {
        throw new Error('Backup directory not found');
      }

      // Get all save files from backup
      const backupFiles = await fs.readdir(backupPath);
      const saveFiles = backupFiles.filter(file => 
        file.endsWith('.sl2') || 
        file.includes('DS30000') ||
        file.includes('DRAKS0005') ||
        (file.toLowerCase().includes('test') && file.endsWith('.sl2'))
      );

      if (saveFiles.length === 0) {
        throw new Error('No save files found in backup');
      }

      // Ensure save directory exists
      await fs.mkdir(savePath, { recursive: true });

      // Restore each save file
      for (const file of saveFiles) {
        const backupFilePath = path.join(backupPath, file);
        const saveFilePath = path.join(savePath, file);
        
        // Create backup of current save file (if exists)
        try {
          await fs.access(saveFilePath);
          const backupName = `${file}.backup.${Date.now()}`;
          await fs.copyFile(saveFilePath, path.join(savePath, backupName));
        } catch (error) {
          // Original save doesn't exist, no need to backup
        }
        
        // Restore from backup
        await fs.copyFile(backupFilePath, saveFilePath);
      }

      // Add restore info
      const restoreInfo = {
        timestamp: new Date().toISOString(),
        filesRestored: saveFiles.length,
        files: saveFiles
      };
      
      await fs.writeFile(
        path.join(savePath, 'restore-info.json'),
        JSON.stringify(restoreInfo, null, 2)
      );

      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  }

  async getBackupInfo(backupPath: string): Promise<{
    hasBackup: boolean;
    fileCount: number;
    lastBackup?: string;
    files: string[];
  }> {
    try {
      const backupFiles = await fs.readdir(backupPath);
      const saveFiles = backupFiles.filter(file => 
        file.endsWith('.sl2') || 
        file.includes('DS30000') ||
        file.includes('DRAKS0005') ||
        (file.toLowerCase().includes('test') && file.endsWith('.sl2'))
      );

      let lastBackup: string | undefined;
      try {
        const syncInfoPath = path.join(backupPath, 'sync-info.json');
        const syncInfo = JSON.parse(await fs.readFile(syncInfoPath, 'utf-8'));
        lastBackup = syncInfo.timestamp;
      } catch (error) {
        // No sync info available
      }

      return {
        hasBackup: saveFiles.length > 0,
        fileCount: saveFiles.length,
        lastBackup,
        files: saveFiles
      };
    } catch (error) {
      return {
        hasBackup: false,
        fileCount: 0,
        files: []
      };
    }
  }
}