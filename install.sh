#!/bin/bash

# Bonfire Backup - Dark Souls III Save Sync Tool
# Installation Script for Linux

set -e

REPO_URL="https://github.com/username/bonfire-backup"
INSTALL_DIR="$HOME/.local/share/bonfire-backup"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"

echo "🔥 Installing Bonfire Backup - Dark Souls III Save Sync Tool..."

# Check if curl or wget is available
if command -v curl >/dev/null 2>&1; then
    DOWNLOADER="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
    DOWNLOADER="wget -qO-"
else
    echo "❌ Error: curl or wget is required but not installed."
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64) ARCH="x64" ;;
    aarch64) ARCH="arm64" ;;
    *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Create directories
mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$DESKTOP_DIR"

echo "📦 Downloading Bonfire Backup for Linux ($ARCH)..."

# Download the latest release
DOWNLOAD_URL="$REPO_URL/releases/latest/download/bonfire-backup-linux-$ARCH.AppImage"

if ! $DOWNLOADER "$DOWNLOAD_URL" -o "$INSTALL_DIR/bonfire-backup.AppImage"; then
    echo "❌ Failed to download Bonfire Backup. Please check your internet connection."
    exit 1
fi

# Make executable
chmod +x "$INSTALL_DIR/bonfire-backup.AppImage"

# Create symlink in PATH
ln -sf "$INSTALL_DIR/bonfire-backup.AppImage" "$BIN_DIR/bonfire-backup"

# Create desktop entry
cat > "$DESKTOP_DIR/bonfire-backup.desktop" << EOF
[Desktop Entry]
Name=Bonfire Backup
Comment=Dark Souls III Save File Sync Tool
Exec=$INSTALL_DIR/bonfire-backup.AppImage
Icon=$INSTALL_DIR/bonfire-backup.AppImage
Terminal=false
Type=Application
Categories=Utility;Game;
StartupWMClass=bonfire-backup
EOF

# Update desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

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
echo "   2. Configure your save file path"
echo "   3. Set up your Git repository for backups"
echo "   4. Enable auto-sync to never lose progress again!"

# Check if .local/bin is in PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠️  Note: $HOME/.local/bin is not in your PATH."
    echo "   Add this line to your ~/.bashrc or ~/.zshrc:"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
fi