param(
    [string]$Branch = "main",
    [string]$Remote = "origin",
    [bool]$AutoStash = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Always run git commands from the script's directory so callers can invoke
# this script from anywhere.
Set-Location -LiteralPath $PSScriptRoot

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Invoke-Git {
    param(
        [string[]]$GitArgs = @()
    )

    if ($GitArgs.Count -eq 0) {
        throw "Invoke-Git called without arguments."
    }

    & git @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE."
    }
}

function Invoke-GitCapture {
    param(
        [string[]]$GitArgs = @()
    )

    if ($GitArgs.Count -eq 0) {
        throw "Invoke-GitCapture called without arguments."
    }

    $output = & git @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed.`n$output"
    }
    return ($output -join "`n").Trim()
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or not on PATH. Install Git and restart your terminal."
}

$repoRoot = Invoke-GitCapture @("rev-parse", "--show-toplevel")
if (-not $repoRoot) {
    throw "No git repository found at '$PSScriptRoot'. Clone or initialize the repo in this folder first."
}

Write-Step "Fetching latest '$Remote/$Branch'"
Invoke-Git @("fetch", $Remote, $Branch)

Write-Step "Checking out '$Branch'"
& git show-ref --verify --quiet "refs/heads/$Branch"
if ($LASTEXITCODE -eq 0) {
    Invoke-Git @("checkout", $Branch)
} elseif ($LASTEXITCODE -eq 1) {
    Invoke-Git @("checkout", "-b", $Branch, "$Remote/$Branch")
} else {
    throw "Unable to determine whether local branch '$Branch' exists (exit code $LASTEXITCODE)."
}

$hasLocalChanges = $false
$stashCreated = $false
$stashName = "checkin-autostash-" + (Get-Date -Format "yyyyMMdd-HHmmss")

$statusLines = & git status --porcelain
if ($LASTEXITCODE -ne 0) {
    throw "git status --porcelain failed with exit code $LASTEXITCODE."
}

if ($statusLines) {
    $hasLocalChanges = $true
}

if ($hasLocalChanges -and $AutoStash) {
    Write-Step "Auto-stashing local changes"
    Invoke-Git @("stash", "push", "--include-untracked", "-m", $stashName)
    $stashCreated = $true
} elseif ($hasLocalChanges) {
    throw "Working tree has local changes. Commit, stash, or run with -AutoStash `$true."
}

Write-Step "Pulling latest changes with rebase"
Invoke-Git @("pull", "--rebase", $Remote, $Branch)

if ($stashCreated) {
    Write-Step "Restoring auto-stashed changes"
    Invoke-Git @("stash", "pop")
}

Write-Step "Working tree status"
Invoke-Git @("status", "-sb")

Write-Host ""
Write-Host "Done. '$Branch' is up to date and ready." -ForegroundColor Green
