# ============================================================
#  update-and-start.ps1
#  Checks GitHub for new commits -> pulls if behind -> npm install
#  if package.json changed -> starts the bot via npm start
#
#  Usage:  .\update-and-start.ps1
#  Optional flags:
#    -Branch main          (default: current branch)
#    -Remote origin        (default: origin)
#    -CheckIntervalSec 0   (set >0 to loop continuously, 0 = run once)
# ============================================================

param(
    [string]$Branch         = "",
    [string]$Remote         = "origin",
    [int]   $CheckIntervalSec = 0   # 0 = run once; >0 = polling loop
)

$ErrorActionPreference = "Stop"

# -- Helpers -------------------------------------------------
function Write-Step   { param($msg) Write-Host "  >> $msg" -ForegroundColor Cyan }
function Write-Ok     { param($msg) Write-Host "  OK $msg" -ForegroundColor Green }
function Write-Warn   { param($msg) Write-Host "  !! $msg" -ForegroundColor Yellow }
function Write-Err    { param($msg) Write-Host "  XX $msg" -ForegroundColor Red }

function Get-ScriptRoot2 {
    Split-Path -Parent $PSCommandPath
}

# -- Main logic ----------------------------------------------
function Invoke-UpdateAndStart {
    $rootDir = Get-ScriptRoot2
    Set-Location $rootDir

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor DarkMagenta
    Write-Host "  DSC SRM RMP Bot - Auto Update & Start   " -ForegroundColor Magenta
    Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
    Write-Host "==========================================" -ForegroundColor DarkMagenta
    Write-Host ""

    # 1. Determine branch
    if (-not $Branch) {
        $Branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
        if (-not $Branch) { $Branch = "main" }
    }
    Write-Step "Branch: $Branch | Remote: $Remote"

    # 2. Fetch remote changes (no merge yet)
    Write-Step "Fetching $Remote..."
    git fetch $Remote $Branch --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "git fetch failed - check network/credentials. Starting with local code."
        Start-Bot $rootDir
        return
    }

    # 3. Compare local vs remote
    $localHash  = (git rev-parse HEAD).Trim()
    $remoteHash = (git rev-parse "$Remote/$Branch").Trim()

    if ($localHash -eq $remoteHash) {
        Write-Ok "Already up to date ($($localHash.Substring(0,7))). No pull needed."
    } else {
        # Show what's coming in
        $commitCount = (git rev-list HEAD.."$Remote/$Branch" --count).Trim()
        Write-Warn "$commitCount new commit(s) available. Pulling..."
        git log HEAD.."$Remote/$Branch" --oneline --no-color | ForEach-Object {
            Write-Host "    $_" -ForegroundColor DarkGray
        }

        # Check if package.json changed in the incoming commits
        $pkgDiff = git diff HEAD "$Remote/$Branch" -- package.json --name-only 2>&1
        $pkgChanged = ($pkgDiff -match "package\.json")

        # 3a. Pull
        git pull $Remote $Branch --rebase 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        if ($LASTEXITCODE -ne 0) {
            Write-Err "git pull failed. Resolve conflicts manually then re-run."
            exit 1
        }
        $newHash = (git rev-parse HEAD).Trim()
        Write-Ok "Updated to $($newHash.Substring(0,7))"

        # 3b. npm install only if dependencies changed
        if ($pkgChanged) {
            Write-Step "package.json changed - running npm install..."
            npm install --prefer-offline 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
            if ($LASTEXITCODE -ne 0) {
                Write-Err "npm install failed."
                exit 1
            }
            Write-Ok "Dependencies installed."
        } else {
            Write-Ok "package.json unchanged - skipping npm install."
        }
    }

    # 4. Start the bot
    Start-Bot $rootDir
}

function Start-Bot {
    param([string]$rootDir)
    Set-Location $rootDir
    Write-Host ""
    Write-Step "Starting bot (npm start)..."
    Write-Host ""
    npm start
}

# -- Entry point ---------------------------------------------
if ($CheckIntervalSec -gt 0) {
    Write-Host "Polling mode: re-checking after bot exits every $CheckIntervalSec seconds." -ForegroundColor DarkCyan
    while ($true) {
        try {
            Invoke-UpdateAndStart
        } catch {
            Write-Err "Error: $_"
        }
        Write-Host ""
        Write-Host "  Bot exited. Waiting $CheckIntervalSec s before next check..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $CheckIntervalSec
    }
} else {
    Invoke-UpdateAndStart
}
