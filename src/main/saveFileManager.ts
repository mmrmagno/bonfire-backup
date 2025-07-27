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
      const appData = process.env.APPDATA;
      if (appData) {
        possiblePaths = [
          path.join(appData, 'DarkSoulsIII'),
          path.join(os.homedir(), 'Documents', 'NBGI', 'DARK SOULS III'),
        ];
      }
    } else if (platform === 'linux') {
      const steamPath = path.join(os.homedir(), '.steam', 'steam', 'userdata');
      try {
        const userDirs = await fs.readdir(steamPath);
        for (const userDir of userDirs) {
          if (!isNaN(Number(userDir))) {
            possiblePaths.push(
              path.join(steamPath, userDir, '374320', 'remote')
            );
          }
        }
      } catch (error) {
        // Steam not found, try other locations
        possiblePaths.push(
          path.join(os.homedir(), '.local', 'share', 'Steam', 'userdata'),
          path.join(os.homedir(), 'Games', 'dark-souls-3', 'saves')
        );
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
      
      // Check for Dark Souls III save file patterns
      const hasSaveFiles = files.some(file => 
        file.endsWith('.sl2') || 
        file.includes('DS30000') ||
        file.includes('DRAKS0005')
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
        file.includes('DRAKS0005')
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
}