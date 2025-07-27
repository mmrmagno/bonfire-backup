# Bonfire Backup - Dark Souls III Save Sync Tool
# Installation Script for Windows PowerShell

param(
    [string]$InstallPath = "$env:LOCALAPPDATA\BonfireBackup"
)

$ErrorActionPreference = "Stop"

Write-Host "🔥 Installing Bonfire Backup - Dark Souls III Save Sync Tool..." -ForegroundColor Yellow

$RepoUrl = "https://github.com/username/bonfire-backup"
$BinName = "bonfire-backup.exe"

# Detect architecture
$Arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }

try {
    # Create installation directory
    if (!(Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }

    Write-Host "📦 Downloading Bonfire Backup for Windows ($Arch)..." -ForegroundColor Cyan

    # Download URL
    $DownloadUrl = "$RepoUrl/releases/latest/download/bonfire-backup-win-$Arch.exe"
    $ExePath = Join-Path $InstallPath $BinName

    # Download the executable
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing

    Write-Host "🔧 Setting up shortcuts..." -ForegroundColor Cyan

    # Create Start Menu shortcut
    $StartMenuPath = [Environment]::GetFolderPath("StartMenu")
    $ShortcutPath = Join-Path $StartMenuPath "Programs\Bonfire Backup.lnk"
    
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $ExePath
    $Shortcut.WorkingDirectory = $InstallPath
    $Shortcut.Description = "Dark Souls III Save File Sync Tool"
    $Shortcut.Save()

    # Create Desktop shortcut (optional)
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $DesktopShortcut = Join-Path $DesktopPath "Bonfire Backup.lnk"
    
    $DesktopLink = $WshShell.CreateShortcut($DesktopShortcut)
    $DesktopLink.TargetPath = $ExePath
    $DesktopLink.WorkingDirectory = $InstallPath
    $DesktopLink.Description = "Dark Souls III Save File Sync Tool"
    $DesktopLink.Save()

    # Add to PATH (for current user)
    $UserPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
    if ($UserPath -notlike "*$InstallPath*") {
        $NewPath = if ($UserPath) { "$UserPath;$InstallPath" } else { $InstallPath }
        [Environment]::SetEnvironmentVariable("Path", $NewPath, [EnvironmentVariableTarget]::User)
        Write-Host "📍 Added to PATH (restart terminal to use 'bonfire-backup' command)" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "✅ Bonfire Backup installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎮 You can now:" -ForegroundColor White
    Write-Host "   • Launch from Start Menu or Desktop shortcut" -ForegroundColor Gray
    Write-Host "   • Run 'bonfire-backup' from Command Prompt (after restart)" -ForegroundColor Gray
    Write-Host "   • Find it in: $InstallPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔥 Praise the Sun! Your Dark Souls III saves are ready to be protected." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📖 Next steps:" -ForegroundColor White
    Write-Host "   1. Launch Bonfire Backup from Start Menu" -ForegroundColor Gray
    Write-Host "   2. Configure your save file path (usually auto-detected)" -ForegroundColor Gray
    Write-Host "   3. Set up your Git repository for backups" -ForegroundColor Gray
    Write-Host "   4. Enable auto-sync to never lose progress again!" -ForegroundColor Gray

} catch {
    Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please try running as Administrator or check your internet connection." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")