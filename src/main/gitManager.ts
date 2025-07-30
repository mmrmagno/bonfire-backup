import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

export class GitManager {
  private git?: SimpleGit;
  private repoPath?: string;
  private token?: string;

  setToken(token: string) {
    this.token = token;
  }

  private getAuthenticatedUrl(url: string): string {
    if (this.token && url.startsWith('https://github.com/')) {
      // Convert HTTPS URL to authenticated URL
      const urlParts = url.replace('https://github.com/', '').replace('.git', '');
      return `https://${this.token}@github.com/${urlParts}.git`;
    }
    return url;
  }

  async initializeRepository(backupPath: string, repoUrl?: string): Promise<boolean> {
    try {
      this.repoPath = backupPath;
      await fs.mkdir(backupPath, { recursive: true });
      
      this.git = simpleGit(backupPath);

      // Check if already a git repo and handle branch migration
      let isNewRepo = false;
      let needsBranchMigration = false;
      try {
        const status = await this.git.status();
        const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
        if (currentBranch.trim() === 'master') {
          needsBranchMigration = true;
        }
      } catch (error) {
        // Not a git repo, initialize
        isNewRepo = true;
        await this.git.init();
        
        // Set default branch to main
        await this.git.raw(['config', 'init.defaultBranch', 'main']);
        await this.git.checkoutLocalBranch('main');
        
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

      // Handle branch migration from master to main
      if (needsBranchMigration && !isNewRepo) {
        try {
          console.log('⚠️  Repository is using "master" branch but remote expects "main". Migrating...');
          // Create main branch from master
          await this.git.checkoutLocalBranch('main');
          await this.git.raw(['branch', '-D', 'master']);
          console.log('✅ Successfully migrated from "master" to "main" branch');
        } catch (error) {
          console.error('❌ Branch migration failed:', error);
          throw new Error('Failed to migrate from master to main branch. This may be why your repository is not syncing properly.');
        }
      }

      // Add remote if provided
      if (repoUrl) {
        try {
          await this.git.removeRemote('origin');
        } catch (error) {
          // Remote doesn't exist, ignore
        }
        
        const authenticatedUrl = this.getAuthenticatedUrl(repoUrl);
        await this.git.addRemote('origin', authenticatedUrl);
        
        // If it's a new repo, try to push the initial commit
        if (isNewRepo) {
          try {
            await this.git.push(['-u', 'origin', 'main']);
          } catch (pushError) {
            // If remote has content, pull it first
            try {
              await this.git.pull('origin', 'main', ['--allow-unrelated-histories']);
            } catch (pullError) {
              console.warn('Could not pull from remote:', pullError);
            }
          }
        } else {
          // Existing repo, try to sync with remote
          await this.syncWithRemote();
        }
      }

      return true;
    } catch (error) {
      console.error('Git initialization failed:', error);
      return false;
    }
  }

  async syncWithRemote(): Promise<boolean> {
    if (!this.git || !this.repoPath) {
      return false;
    }

    try {
      // Fetch latest changes
      await this.git.fetch('origin');
      
      // Check if we're behind
      const status = await this.git.status();
      if (status.behind && status.behind > 0) {
        // Pull latest changes
        await this.git.pull('origin', 'main');
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Sync with remote failed:', error);
      return false;
    }
  }

  async commitAndPush(message: string = 'Save file backup'): Promise<boolean> {
    if (!this.git || !this.repoPath) {
      console.warn('Git not initialized, skipping commit');
      return false;
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
        const errorMessage = (pushError as Error).message;
        if (errorMessage.includes('master') || errorMessage.includes('main')) {
          console.error('❌ Push failed due to branch mismatch. Your local repository uses a different branch than your remote repository.');
          throw new Error('Push failed: Branch mismatch between local and remote repository. Make sure your remote repository uses the "main" branch.');
        } else {
          console.warn('Push failed, but commit was successful:', pushError);
          throw new Error('Failed to push to remote repository. Check your repository URL and credentials.');
        }
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
    if (!this.git || !this.repoPath) {
      return {
        hasChanges: false,
        ahead: 0,
        behind: 0,
        files: []
      };
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