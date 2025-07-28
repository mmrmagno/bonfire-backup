#!/bin/bash

# Bonfire Backup - Dark Souls III Save Sync Tool
# Installation Script for Linux

set -e

REPO_OWNER="mmrmagno"
REPO_NAME="bonfire-backup"
REPO_URL="https://github.com/$REPO_OWNER/$REPO_NAME"
INSTALL_DIR="$HOME/.local/share/bonfire-backup"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"

echo "🔥 Installing Bonfire Backup - Dark Souls III Save Sync Tool..."

# Check if curl or wget is available
if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl -fsSL"
    DOWNLOAD_CMD="curl -fsSL -o"
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget -qO-"
    DOWNLOAD_CMD="wget -qO"
else
    echo "❌ Error: curl or wget is required but not installed."
    exit 1
fi

# Check if tar is available
if ! command -v tar >/dev/null 2>&1; then
    echo "❌ Error: tar is required but not installed."
    exit 1
fi

# Create directories
mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$DESKTOP_DIR"

echo "🔍 Finding latest release..."

# Get latest release info from GitHub API
LATEST_RELEASE_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/latest"
RELEASE_INFO=$($DOWNLOADER "$LATEST_RELEASE_URL")

# Extract download URL for Linux tar.gz
DOWNLOAD_URL=$(echo "$RELEASE_INFO" | grep -o '"browser_download_url": "[^"]*linux\.tar\.gz"' | cut -d'"' -f4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo "❌ Could not find Linux binary in latest release."
    echo "Please visit $REPO_URL/releases and download manually."
    exit 1
fi

echo "📦 Downloading Bonfire Backup for Linux..."
echo "⬇️  Downloading from: $DOWNLOAD_URL"

# Download and extract
TEMP_FILE="/tmp/bonfire-backup-linux.tar.gz"
if ! $DOWNLOAD_CMD "$TEMP_FILE" "$DOWNLOAD_URL"; then
    echo "❌ Failed to download Bonfire Backup. Please check your internet connection."
    exit 1
fi

echo "📁 Extracting application..."
tar -xzf "$TEMP_FILE" -C "$INSTALL_DIR"
rm "$TEMP_FILE"

# Make executable
chmod +x "$INSTALL_DIR/bonfire-backup"

# Create symlink in PATH
ln -sf "$INSTALL_DIR/bonfire-backup" "$BIN_DIR/bonfire-backup"

echo "🖥️  Creating desktop entry..."

# Create desktop entry
cat > "$DESKTOP_DIR/bonfire-backup.desktop" << EOF
[Desktop Entry]
Name=Bonfire Backup
Comment=Dark Souls III Save File Sync Tool
Exec=$INSTALL_DIR/bonfire-backup
Icon=$INSTALL_DIR/resources/app.asar.unpacked/assets/icon.png
Terminal=false
Type=Application
Categories=Utility;Game;
StartupWMClass=bonfire-backup
EOF

# Make desktop entry executable
chmod +x "$DESKTOP_DIR/bonfire-backup.desktop"

# Update desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo ""
echo "✅ Bonfire Backup installed successfully!"
echo ""
echo "🎮 You can now:"
echo "   • Run 'bonfire-backup' from terminal"
echo "   • Launch from your application menu"
echo "   • Find it in the Utilities category"
echo ""
echo "🔥 Praise the Sun! Your Dark Souls III saves are ready to be protected."
echo ""
echo "📖 Next steps:"
echo "   1. Launch Bonfire Backup"
echo "   2. Configure your save file path (usually auto-detected)"
echo "   3. Set up your Git repository for backups"
echo "   4. Enable auto-sync to never lose progress again!"

# Check if .local/bin is in PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠️  Note: $HOME/.local/bin is not in your PATH."
    echo "   Add this line to your ~/.bashrc or ~/.zshrc:"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo "   Then restart your terminal or run: source ~/.bashrc"
fi