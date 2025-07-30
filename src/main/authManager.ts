import { BrowserWindow, shell } from 'electron';
import Store from 'electron-store';
import * as https from 'https';

interface GitHubDeviceAuth {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface GitHubToken {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
}

export class AuthManager {
  private store: Store;
  private mainWindow: BrowserWindow;
  private readonly clientId = 'Ov23licTeg98zrKoXTGu'; // Bonfire Backup GitHub OAuth App

  constructor(mainWindow: BrowserWindow, store: Store) {
    this.mainWindow = mainWindow;
    this.store = store;
  }

  async startGitHubAuth(): Promise<{ userCode: string; verificationUri: string; deviceCode: string; interval: number }> {
    try {
      console.log('Starting GitHub OAuth device flow...');
      const deviceAuth = await this.initiateDeviceFlow();
      console.log('Device flow initiated successfully:', { 
        userCode: deviceAuth.user_code, 
        verificationUri: deviceAuth.verification_uri 
      });
      
      // Open GitHub authorization page
      await shell.openExternal(deviceAuth.verification_uri);
      
      return {
        userCode: deviceAuth.user_code,
        verificationUri: deviceAuth.verification_uri,
        deviceCode: deviceAuth.device_code,
        interval: deviceAuth.interval
      };
    } catch (error) {
      console.error('Failed to start GitHub auth - detailed error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initiate GitHub authentication: ${errorMessage}`);
    }
  }

  async completeGitHubAuth(deviceCode: string, interval: number): Promise<boolean> {
    try {
      // Try to get token once (no internal polling)
      const token = await this.requestToken(deviceCode);
      
      const user = await this.getUserInfo(token.access_token);
      
      // Store authentication data
      this.store.set('github.token', token.access_token);
      this.store.set('github.user', user);
      this.store.set('github.authenticated', true);
      
      console.log('GitHub authentication completed successfully');
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'unknown';
      if (errorMessage === 'authorization_pending') {
        // Still waiting for user authorization
        return false;
      } else if (errorMessage === 'slow_down') {
        // Rate limit hit, tell frontend to slow down
        return false;
      } else {
        // Real error (expired, denied, etc.)
        console.error('GitHub auth failed:', errorMessage);
        throw new Error(`GitHub authentication failed: ${errorMessage}`);
      }
    }
  }

  async createRepository(repoName: string, isPrivate: boolean = false): Promise<string> {
    const token = this.store.get('github.token') as string;
    if (!token) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const repoData = await this.makeGitHubRequest('POST', '/user/repos', {
        name: repoName,
        private: isPrivate,
        description: 'Dark Souls III save file backup repository created by Bonfire Backup',
        auto_init: true
      }, token) as { clone_url: string };

      return repoData.clone_url;
    } catch (error) {
      console.error('Failed to create repository:', error);
      throw new Error('Failed to create GitHub repository');
    }
  }

  async listRepositories(): Promise<Array<{ name: string; clone_url: string; private: boolean }>> {
    const token = this.store.get('github.token') as string;
    if (!token) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const repos = await this.makeGitHubRequest('GET', '/user/repos?sort=updated&per_page=50', null, token) as Array<{ name: string; clone_url: string; private: boolean }>;
      
      return repos.map((repo: { name: string; clone_url: string; private: boolean }) => ({
        name: repo.name,
        clone_url: repo.clone_url,
        private: repo.private
      }));
    } catch (error) {
      console.error('Failed to list repositories:', error);
      throw new Error('Failed to list GitHub repositories');
    }
  }

  getAuthStatus(): { authenticated: boolean; user?: GitHubUser } {
    const authenticated = this.store.get('github.authenticated', false) as boolean;
    const user = this.store.get('github.user') as GitHubUser;
    
    return { authenticated, user };
  }

  logout(): void {
    this.store.delete('github.token');
    this.store.delete('github.user');
    this.store.delete('github.authenticated');
  }

  getStoredToken(): string | null {
    return this.store.get('github.token') as string || null;
  }

  private async initiateDeviceFlow(): Promise<GitHubDeviceAuth> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        client_id: this.clientId,
        scope: 'repo'
      });

      console.log('Making device flow request to GitHub...', { clientId: this.clientId });

      const options = {
        hostname: 'github.com',
        port: 443,
        path: '/login/device/code',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Bonfire-Backup/1.0.0-beta.4',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        console.log('GitHub response status:', res.statusCode);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log('GitHub response data:', data);
          try {
            const result = JSON.parse(data);
            if (res.statusCode === 200) {
              resolve(result);
            } else {
              console.error('GitHub API error:', result);
              reject(new Error(result.error_description || result.error || 'Failed to initiate device flow'));
            }
          } catch (error) {
            console.error('Failed to parse GitHub response:', error);
            reject(new Error('Invalid response from GitHub API'));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Request error:', error);
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
  }

  private async pollForToken(deviceCode: string, interval: number): Promise<GitHubToken | null> {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    return new Promise((resolve) => {
      const poll = async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          resolve(null);
          return;
        }

        try {
          const token = await this.requestToken(deviceCode);
          resolve(token);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'unknown';
          if (errorMessage === 'authorization_pending') {
            // Continue polling
            setTimeout(poll, interval * 1000);
          } else if (errorMessage === 'slow_down') {
            // Increase interval and continue
            setTimeout(poll, (interval + 5) * 1000);
          } else {
            // Authorization denied or expired
            resolve(null);
          }
        }
      };

      poll();
    });
  }

  private async requestToken(deviceCode: string): Promise<GitHubToken> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        client_id: this.clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      });

      const options = {
        hostname: 'github.com',
        port: 443,
        path: '/login/oauth/access_token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Bonfire-Backup/1.0.0-beta.4',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.access_token) {
              resolve(result);
            } else {
              reject(new Error(result.error));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  private async getUserInfo(token: string): Promise<GitHubUser> {
    return this.makeGitHubRequest('GET', '/user', null, token) as Promise<GitHubUser>;
  }

  private async makeGitHubRequest(method: string, path: string, data: unknown, token: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const headers: { [key: string]: string | number } = {
        'Authorization': `token ${token}`,
        'User-Agent': 'Bonfire-Backup/1.0.0-beta.4',
        'Accept': 'application/vnd.github.v3+json'
      };

      if (data) {
        const postData = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const options = {
        hostname: 'api.github.com',
        port: 443,
        path: path,
        method: method,
        headers: headers
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            const statusCode = res.statusCode || 0;
            if (statusCode >= 200 && statusCode < 300) {
              resolve(result);
            } else {
              reject(new Error(result.message || `HTTP ${statusCode}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }
}