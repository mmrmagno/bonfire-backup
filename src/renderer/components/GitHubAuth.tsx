import React, { useState, useEffect } from 'react';
import { Github, LogOut, Plus, List, Lock, Unlock, CheckCircle, RefreshCw } from 'lucide-react';
import { GitHubUser } from '../../types';

interface GitHubAuthProps {
  onRepoSelected: (repoUrl: string) => void;
  selectedRepo?: string;
}

const GitHubAuth: React.FC<GitHubAuthProps> = ({ onRepoSelected, selectedRepo }) => {
  const [authStatus, setAuthStatus] = useState<{ authenticated: boolean; user?: GitHubUser }>({ authenticated: false });
  const [authInProgress, setAuthInProgress] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  const [repositories, setRepositories] = useState<Array<{ name: string; clone_url: string; private: boolean }>>([]);
  const [showRepoList, setShowRepoList] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);

  useEffect(() => {
    loadAuthStatus();
  }, []);

  const loadAuthStatus = async () => {
    try {
      const status = await window.electronAPI.getAuthStatus();
      setAuthStatus(status);
      if (status.authenticated) {
        loadRepositories();
      }
    } catch (error) {
      console.error('Failed to load auth status:', error);
    }
  };

  const loadRepositories = async () => {
    if (!authStatus.authenticated) return;
    
    setLoadingRepos(true);
    try {
      const repos = await window.electronAPI.listGitHubRepos();
      setRepositories(repos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoadingRepos(false);
    }
  };

  const startAuthentication = async () => {
    setAuthInProgress(true);
    try {
      const authData = await window.electronAPI.startGitHubAuth();
      setUserCode(authData.userCode);
      setVerificationUri(authData.verificationUri);
      
      // Start polling for completion
      pollForCompletion(authData.userCode, 5); // 5 second interval
    } catch (error) {
      console.error('Failed to start authentication:', error);
      setAuthInProgress(false);
    }
  };

  const pollForCompletion = async (deviceCode: string, interval: number) => {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        setAuthInProgress(false);
        setUserCode('');
        setVerificationUri('');
        return;
      }

      try {
        const success = await window.electronAPI.completeGitHubAuth(deviceCode, interval);
        if (success) {
          setAuthInProgress(false);
          setUserCode('');
          setVerificationUri('');
          await loadAuthStatus();
        } else {
          setTimeout(poll, interval * 1000);
        }
      } catch (error) {
        console.error('Auth polling error:', error);
        setTimeout(poll, interval * 1000);
      }
    };

    poll();
  };

  const logout = async () => {
    try {
      await window.electronAPI.logoutGitHub();
      setAuthStatus({ authenticated: false });
      setRepositories([]);
      setShowRepoList(false);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const createRepository = async () => {
    if (!newRepoName.trim()) return;
    
    setCreatingRepo(true);
    try {
      const repoUrl = await window.electronAPI.createGitHubRepo(newRepoName, newRepoPrivate);
      onRepoSelected(repoUrl);
      setShowCreateRepo(false);
      setNewRepoName('');
      setNewRepoPrivate(false);
      await loadRepositories();
    } catch (error) {
      console.error('Failed to create repository:', error);
    } finally {
      setCreatingRepo(false);
    }
  };

  if (!authStatus.authenticated) {
    return (
      <div className="ember-border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Github className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-semibold text-orange-200">GitHub Authentication</h2>
        </div>
        
        {!authInProgress ? (
          <div className="space-y-4">
            <p className="text-orange-300/80">
              Connect your GitHub account to easily create and select repositories for backup storage.
            </p>
            
            <button
              onClick={startAuthentication}
              className="flex items-center space-x-2 px-4 py-2 bonfire-glow rounded-lg font-semibold text-orange-100 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200"
            >
              <Github className="w-4 h-4" />
              <span>Connect GitHub Account</span>
            </button>
            
            <div className="text-sm text-gray-400">
              <p className="mb-2">🔒 <strong>Secure Authentication:</strong></p>
              <ul className="space-y-1 ml-4">
                <li>• No passwords stored in the app</li>
                <li>• Uses GitHub&apos;s secure OAuth flow</li>
                <li>• Only requests repository access</li>
                <li>• You can revoke access anytime from GitHub</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-orange-300">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Waiting for authorization...</span>
            </div>
            
            {userCode && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
                <p className="text-orange-200 font-medium mb-2">
                  Enter this code on GitHub:
                </p>
                <div className="font-mono text-2xl text-orange-100 bg-gray-900 px-4 py-2 rounded text-center">
                  {userCode}
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  A browser window should have opened to: {verificationUri}
                </p>
              </div>
            )}
            
            <button
              onClick={() => {
                setAuthInProgress(false);
                setUserCode('');
                setVerificationUri('');
              }}
              className="text-orange-400 hover:text-orange-300 text-sm"
            >
              Cancel Authentication
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ember-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Github className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-semibold text-orange-200">GitHub Repository</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {authStatus.user && (
            <div className="flex items-center space-x-2 text-sm text-orange-300">
              <img 
                src={authStatus.user.avatar_url} 
                alt={authStatus.user.name}
                className="w-6 h-6 rounded-full"
              />
              <span>{authStatus.user.name || authStatus.user.login}</span>
            </div>
          )}
          
          <button
            onClick={logout}
            className="flex items-center space-x-1 text-sm text-gray-400 hover:text-orange-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setShowRepoList(!showRepoList);
              if (!showRepoList) loadRepositories();
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-orange-200 transition-colors"
          >
            <List className="w-4 h-4" />
            <span>Select Existing Repository</span>
          </button>
          
          <button
            onClick={() => setShowCreateRepo(!showCreateRepo)}
            className="flex items-center space-x-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-md text-orange-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Repository</span>
          </button>
        </div>

        {showCreateRepo && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
            <h3 className="text-orange-200 font-medium mb-3">Create New Repository</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-orange-300 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="my-ds3-savefiles"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-orange-100 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="privateRepo"
                  checked={newRepoPrivate}
                  onChange={(e) => setNewRepoPrivate(e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-gray-800 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                />
                <label htmlFor="privateRepo" className="text-orange-200 flex items-center space-x-1">
                  {newRepoPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  <span>Private Repository</span>
                </label>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={createRepository}
                  disabled={!newRepoName.trim() || creatingRepo}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md text-orange-100 transition-colors disabled:opacity-50"
                >
                  {creatingRepo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Repository</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowCreateRepo(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md text-orange-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showRepoList && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-orange-200 font-medium">Your Repositories</h3>
              <button
                onClick={loadRepositories}
                disabled={loadingRepos}
                className="text-orange-400 hover:text-orange-300 text-sm"
              >
                {loadingRepos ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </button>
            </div>
            
            {loadingRepos ? (
              <div className="flex items-center space-x-2 text-orange-300">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading repositories...</span>
              </div>
            ) : repositories.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {repositories.map((repo) => (
                  <div
                    key={repo.name}
                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedRepo === repo.clone_url
                        ? 'bg-orange-500/20 border-orange-500'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                    onClick={() => onRepoSelected(repo.clone_url)}
                  >
                    <div className="flex items-center space-x-3">
                      {repo.private ? (
                        <Lock className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Unlock className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-orange-100">{repo.name}</span>
                    </div>
                    
                    {selectedRepo === repo.clone_url && (
                      <CheckCircle className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">
                No repositories found. Create a new one above.
              </p>
            )}
          </div>
        )}

        {selectedRepo && (
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-200 text-sm">Repository selected</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubAuth;