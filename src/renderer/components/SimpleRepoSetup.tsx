import React, { useState } from 'react';
import { Github, ExternalLink, Copy, CheckCircle, AlertCircle, Book } from 'lucide-react';

interface SimpleRepoSetupProps {
  onRepoSelected: (repoUrl: string) => void;
  selectedRepo?: string;
}

const SimpleRepoSetup: React.FC<SimpleRepoSetupProps> = ({ onRepoSelected, selectedRepo }) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [repoUrl, setRepoUrl] = useState(selectedRepo || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleRepoUrlChange = (url: string) => {
    setRepoUrl(url);
    if (url.trim()) {
      onRepoSelected(url.trim());
    }
  };

  const sampleRepoName = 'ds3-savefiles';
  const instructions = [
    {
      step: 1,
      title: "Create GitHub Repository",
      content: (
        <div>
          <p className="mb-2">Go to GitHub and create a new repository:</p>
          <div className="flex items-center space-x-2 mb-2">
            <a 
              href="https://github.com/new" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-orange-200 transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              <span>Create New Repository</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="text-sm text-gray-400">
            <p>• Repository name: <code className="bg-gray-800 px-1 rounded">{sampleRepoName}</code></p>
            <p>• Make it <strong>Private</strong> (recommended for save files)</p>
            <p>• Check "Add a README file"</p>
          </div>
        </div>
      )
    },
    {
      step: 2,
      title: "Copy Repository URL",
      content: (
        <div>
          <p className="mb-2">After creating the repository, copy its HTTPS URL:</p>
          <div className="bg-gray-800 p-3 rounded border border-gray-600 mb-2">
            <code className="text-orange-200">https://github.com/yourusername/{sampleRepoName}.git</code>
          </div>
          <p className="text-sm text-gray-400">
            You&apos;ll find this URL on your repository page under the green "Code" button.
          </p>
        </div>
      )
    },
    {
      step: 3,
      title: "Set Up Authentication",
      content: (
        <div>
          <p className="mb-2">Create a Personal Access Token for authentication:</p>
          <div className="flex items-center space-x-2 mb-3">
            <a 
              href="https://github.com/settings/tokens/new?scopes=repo&description=Bonfire%20Backup" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-orange-200 transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              <span>Create Token</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <p>• Select "repo" scope (full control of private repositories)</p>
            <p>• Set expiration to "No expiration" or 1 year</p>
            <p>• Copy the generated token and save it safely</p>
          </div>
        </div>
      )
    },
    {
      step: 4,
      title: "Configure Repository URL",
      content: (
        <div>
          <p className="mb-2">Enter your repository URL with the token format:</p>
          <div className="bg-gray-800 p-3 rounded border border-gray-600 mb-2">
            <code className="text-orange-200 text-sm break-all">
              https://your_token@github.com/yourusername/{sampleRepoName}.git
            </code>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={() => handleCopy(`https://your_token@github.com/yourusername/${sampleRepoName}.git`)}
              className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-orange-200 transition-colors text-xs"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Template</span>
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-400">
            Replace "your_token" with your Personal Access Token and "yourusername" with your GitHub username.
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="ember-border rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Github className="w-6 h-6 text-orange-400" />
        <h2 className="text-xl font-semibold text-orange-200">Repository Setup</h2>
      </div>

      <div className="space-y-4">
        <p className="text-orange-300/80">
          Set up a GitHub repository to store your save file backups securely in the cloud.
        </p>

        {/* Repository URL Input */}
        <div>
          <label className="block text-sm font-medium text-orange-300 mb-2">
            Repository URL
          </label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => handleRepoUrlChange(e.target.value)}
            placeholder="https://your_token@github.com/username/repository.git"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-orange-100 placeholder-gray-400 focus:outline-none focus:border-orange-500"
          />
          {selectedRepo && (
            <div className="flex items-center space-x-2 mt-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Repository URL configured</span>
            </div>
          )}
        </div>

        {/* Instructions Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md text-orange-100 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Book className="w-4 h-4" />
            <span>{showInstructions ? 'Hide Instructions' : 'Show Setup Instructions'}</span>
          </button>
        </div>

        {/* Step-by-step Instructions */}
        {showInstructions && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
            <h3 className="text-orange-200 font-medium mb-4 flex items-center space-x-2">
              <Book className="w-5 h-5" />
              <span>Step-by-Step Setup Guide</span>
            </h3>
            
            <div className="space-y-6">
              {instructions.map((instruction) => (
                <div key={instruction.step} className="border-l-2 border-orange-500/30 pl-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {instruction.step}
                    </div>
                    <h4 className="text-orange-200 font-medium">{instruction.title}</h4>
                  </div>
                  <div className="text-gray-300 text-sm">
                    {instruction.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-200 font-medium mb-1">Security Note:</p>
                  <p className="text-blue-300">
                    Your Personal Access Token is like a password. Keep it safe and never share it. 
                    The token allows Bonfire Backup to push your save files to your private repository.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleRepoSetup;