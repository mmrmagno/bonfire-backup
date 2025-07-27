import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

export class GitManager {
  private git?: SimpleGit;
  private repoPath?: string;

  async initializeRepository(backupPath: string, repoUrl?: string): Promise<boolean> {
    try {
      this.repoPath = backupPath;
      await fs.mkdir(backupPath, { recursive: true });
      
      this.git = simpleGit(backupPath);

      // Check if already a git repo
      try {
        await this.git.status();
      } catch (error) {
        // Not a git repo, initialize
        await this.git.init();
        
        // Create initial .gitignore
        const gitignore = `# Bonfire Backup
*.tmp
*.log
.DS_Store
Thumbs.db
node_modules/
`;
        await fs.writeFile(path.join(backupPath, '.gitignore'), gitignore);
        
        await this.git.add('.gitignore');
        await this.git.commit('Initial commit - Bonfire Backup setup');
      }

      // Add remote if provided
      if (repoUrl) {
        try {
          await this.git.removeRemote('origin');
        } catch (error) {
          // Remote doesn't exist, ignore
        }
        await this.git.addRemote('origin', repoUrl);
      }

      return true;
    } catch (error) {
      console.error('Git initialization failed:', error);
      return false;
    }
  }

  async commitAndPush(message: string = 'Save file backup'): Promise<boolean> {
    if (!this.git || !this.repoPath) {
      throw new Error('Git not initialized');
    }

    try {
      // Add all changes
      await this.git.add('.');
      
      // Check if there are any changes to commit
      const status = await this.git.status();
      if (status.files.length === 0) {
        return true; // No changes to commit
      }

      // Commit with timestamp
      const timestamp = new Date().toISOString();
      const commitMessage = `${message} - ${timestamp}`;
      await this.git.commit(commitMessage);

      // Try to push if remote exists
      try {
        const remotes = await this.git.getRemotes(true);
        if (remotes.length > 0) {
          await this.git.push('origin', 'main');
        }
      } catch (pushError) {
        console.warn('Push failed, but commit was successful:', pushError);
        // Continue even if push fails - user might not have remote setup
      }

      return true;
    } catch (error) {
      console.error('Git commit failed:', error);
      return false;
    }
  }

  async getStatus(): Promise<{
    hasChanges: boolean;
    ahead: number;
    behind: number;
    files: string[];
    lastCommit?: string;
  }> {
    if (!this.git) {
      throw new Error('Git not initialized');
    }

    try {
      const status: StatusResult = await this.git.status();
      const log = await this.git.log(['-1']);
      
      return {
        hasChanges: status.files.length > 0,
        ahead: status.ahead || 0,
        behind: status.behind || 0,
        files: status.files.map(file => file.path),
        lastCommit: log.latest?.message
      };
    } catch (error) {
      console.error('Git status failed:', error);
      return {
        hasChanges: false,
        ahead: 0,
        behind: 0,
        files: []
      };
    }
  }

  async pullLatest(): Promise<boolean> {
    if (!this.git) {
      throw new Error('Git not initialized');
    }

    try {
      await this.git.pull('origin', 'main');
      return true;
    } catch (error) {
      console.error('Git pull failed:', error);
      return false;
    }
  }
}