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

      // Check if already a git repo and handle branch migration
      let isNewRepo = false;
      let needsBranchMigration = false;
      try {
        await this.git.status();
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
        await this.git.addRemote('origin', repoUrl);
        
        // Always try to fetch from remote first to check if it has content
        try {
          await this.git.fetch('origin');
          
          // Check if remote has a main branch
          const remoteBranches = await this.git.branch(['-r']);
          const hasRemoteMain = remoteBranches.all.includes('origin/main');
          
          if (hasRemoteMain) {
            // Remote has content, pull it
            try {
              if (isNewRepo) {
                // For new repos, we need to pull with allow-unrelated-histories and set up tracking
                await this.git.pull('origin', 'main', ['--allow-unrelated-histories']);
                // Set up tracking branch after successful pull
                await this.git.branch(['--set-upstream-to=origin/main', 'main']);
                console.log('✅ Successfully pulled existing backups from remote repository and set up tracking');
              } else {
                // For existing repos, ensure tracking is set up then sync
                try {
                  await this.git.branch(['--set-upstream-to=origin/main', 'main']);
                } catch (trackingError) {
                  // Tracking might already be set up, ignore error
                }
                await this.git.pull('origin', 'main');
                console.log('✅ Successfully synced with remote repository');
              }
            } catch (pullError) {
              console.error('❌ Failed to pull from remote:', pullError);
              throw new Error(`Failed to pull existing backups from remote repository: ${(pullError as Error).message}`);
            }
          } else if (isNewRepo) {
            // Remote is empty, push our initial commit with upstream tracking
            try {
              await this.git.push(['-u', 'origin', 'main']);
              console.log('✅ Successfully pushed initial commit to remote repository with tracking set up');
            } catch (pushError) {
              console.error('❌ Failed to push to remote:', pushError);
              throw new Error(`Failed to push to remote repository: ${(pushError as Error).message}`);
            }
          }
        } catch (fetchError) {
          // If fetch fails, the remote might not exist or be accessible
          console.error('❌ Failed to fetch from remote:', fetchError);
          const errorMsg = (fetchError as Error).message;
          
          if (errorMsg.includes('Could not resolve host') || errorMsg.includes('network')) {
            throw new Error('Network connection failed. Please check your internet connection and try again.');
          } else if (errorMsg.includes('Authentication failed') || errorMsg.includes('access denied')) {
            throw new Error('Authentication failed. Please check your repository URL and access permissions.');
          } else if (errorMsg.includes('Repository not found') || errorMsg.includes('does not exist')) {
            throw new Error('Repository not found. Please verify your repository URL is correct.');
          } else {
            throw new Error(`Cannot connect to remote repository: ${errorMsg}`);
          }
        }
        
        // If not a new repo, fix any tracking issues and sync
        if (!isNewRepo) {
          await this.ensureTrackingBranch();
          await this.syncWithRemote();
        }
      }

      return true;
    } catch (error) {
      console.error('Git initialization failed:', error);
      return false;
    }
  }

  private async ensureTrackingBranch(): Promise<void> {
    if (!this.git) {
      return;
    }

    try {
      // Simple approach: try to set upstream tracking, ignore if already set
      await this.git.branch(['--set-upstream-to=origin/main', 'main']);
      console.log('✅ Tracking branch configured');
    } catch (error) {
      // This will fail if tracking is already set up, which is fine
      // Only log if it's a real error, not "already exists" type errors
      const errorMsg = (error as Error).message.toLowerCase();
      if (!errorMsg.includes('already') && !errorMsg.includes('exists')) {
        console.warn('Could not set up tracking branch:', error);
      }
    }
  }

  async syncWithRemote(): Promise<boolean> {
    if (!this.git || !this.repoPath) {
      throw new Error('Git repository not initialized. Please configure your repository URL first.');
    }

    try {
      // Ensure tracking branch is set up first
      try {
        await this.git.branch(['--set-upstream-to=origin/main', 'main']);
      } catch (trackingError) {
        // Tracking might already be set up, continue
      }

      // Fetch latest changes
      await this.git.fetch('origin');
      
      // Check if we're behind
      const status = await this.git.status();
      if (status.behind && status.behind > 0) {
        // Pull latest changes
        await this.git.pull('origin', 'main');
        console.log('✅ Pulled latest changes from remote repository');
        return true;
      }
      
      // If we're ahead, try to push
      if (status.ahead && status.ahead > 0) {
        try {
          await this.git.push('origin', 'main');
          console.log('✅ Pushed local changes to remote repository');
        } catch (pushError) {
          console.warn('Could not push to remote:', pushError);
          // Don't fail here, we still synced down successfully
        }
      }
      
      return true;
    } catch (error) {
      console.error('Sync with remote failed:', error);
      throw new Error(`Failed to sync with remote repository: ${(error as Error).message}`);
    }
  }

  async commitAndPush(message: string = 'Save file backup'): Promise<boolean> {
    if (!this.git || !this.repoPath) {
      console.warn('Git not initialized, skipping commit');
      throw new Error('Git repository not initialized. Please configure your repository URL first.');
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
          // Ensure tracking is set up before pushing
          try {
            await this.git.branch(['--set-upstream-to=origin/main', 'main']);
          } catch (trackingError) {
            // Tracking might already be set up, continue
          }
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
      throw new Error(`Failed to commit changes: ${(error as Error).message}`);
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
        files: [],
        lastCommit: 'Repository not initialized'
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
      // Ensure tracking branch is set up first
      try {
        await this.git.branch(['--set-upstream-to=origin/main', 'main']);
      } catch (trackingError) {
        // Tracking might already be set up, continue
      }

      // Fetch first to make sure we have the latest refs
      await this.git.fetch('origin');
      
      // Then pull
      await this.git.pull('origin', 'main');
      console.log('✅ Successfully pulled latest changes from remote');
      return true;
    } catch (error) {
      console.error('Git pull failed:', error);
      throw new Error(`Failed to pull from remote repository: ${(error as Error).message}`);
    }
  }
}