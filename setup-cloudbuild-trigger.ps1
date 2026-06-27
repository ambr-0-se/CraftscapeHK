#!/usr/bin/env pwsh
# Setup Cloud Build trigger for automatic deployment of frontend and backend

Write-Host "🔧 Setting up Cloud Build Trigger for Craftscape HK" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Find gcloud installation
$gcloudPaths = @(
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "$env:ProgramFiles(x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

$gcloudPath = $null
foreach ($path in $gcloudPaths) {
    if (Test-Path $path) {
        $gcloudPath = $path
        break
    }
}

if (-not $gcloudPath) {
    # Try to find in PATH
    $gcloudCmd = Get-Command gcloud -ErrorAction SilentlyContinue
    if ($gcloudCmd) {
        $gcloudPath = $gcloudCmd.Source
    }
}

if (-not $gcloudPath) {
    Write-Host "❌ gcloud CLI not found. Please install Google Cloud SDK first." -ForegroundColor Red
    exit 1
}

Write-Host "Found gcloud at: $gcloudPath" -ForegroundColor Green

# Create alias for easier use
function Invoke-Gcloud {
    & $gcloudPath @args
}

# Set project
$PROJECT_ID = "craftscapehk"
Write-Host "📋 Setting project to: $PROJECT_ID" -ForegroundColor Yellow
Invoke-Gcloud config set project $PROJECT_ID

# Load Gemini API key from .env
Write-Host ""
Write-Host "🔑 Loading Gemini API key from .env..." -ForegroundColor Yellow
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $geminiApiKey = $envContent | Where-Object { $_ -match '^GEMINI_API_KEY=' } | ForEach-Object { $_.Split('=')[1].Trim('"').Trim("'") }
    
    if ($geminiApiKey) {
        Write-Host "✅ Found GEMINI_API_KEY in .env" -ForegroundColor Green
    } else {
        Write-Host "❌ GEMINI_API_KEY not found in .env file" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    exit 1
}

# Enable required APIs
Write-Host ""
Write-Host "🔌 Enabling required APIs..." -ForegroundColor Yellow
Invoke-Gcloud services enable cloudbuild.googleapis.com
Invoke-Gcloud services enable run.googleapis.com
Invoke-Gcloud services enable containerregistry.googleapis.com
Write-Host "✅ APIs enabled" -ForegroundColor Green

# Check if trigger already exists
Write-Host ""
Write-Host "🔍 Checking for existing trigger..." -ForegroundColor Yellow
$existingTrigger = Invoke-Gcloud builds triggers list --filter="name:craftscape-deploy-main" --format="value(name)" 2>$null
if ($existingTrigger) {
    Write-Host "⚠️  Trigger 'craftscape-deploy-main' already exists. Deleting..." -ForegroundColor Yellow
    Invoke-Gcloud builds triggers delete craftscape-deploy-main --quiet
}

# Create Cloud Build trigger
Write-Host ""
Write-Host "🚀 Creating Cloud Build trigger..." -ForegroundColor Yellow
Write-Host "⚠️  Note: If GitHub repository is not connected, this will open a browser for authentication." -ForegroundColor Yellow
Write-Host ""

# Build substitutions string
$substitutions = "_GEMINI_API_KEY=$geminiApiKey"

# Try to create trigger with 2nd gen (GitHub App)
Invoke-Gcloud builds triggers create github `
    --name="craftscape-deploy-main" `
    --description="Auto-deploy Craftscape frontend and backend on push to main" `
    --repo-name="CraftscapeHK" `
    --repo-owner="gracetyy" `
    --branch-pattern="^main$" `
    --build-config="cloudbuild.yaml" `
    --substitutions="$substitutions"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Cloud Build trigger created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Summary:" -ForegroundColor Cyan
    Write-Host "   - Trigger name: craftscape-deploy-main" -ForegroundColor White
    Write-Host "   - Repository: gracetyy/CraftscapeHK" -ForegroundColor White
    Write-Host "   - Branch: main" -ForegroundColor White
    Write-Host "   - Build config: cloudbuild.yaml" -ForegroundColor White
    Write-Host ""
    Write-Host "   - Frontend: https://craftscape-frontend-<hash>.us-central1.run.app" -ForegroundColor Cyan
    Write-Host "   - Backend:  https://craftscape-backend-<hash>.us-central1.run.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 View builds: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID" -ForegroundColor Cyan
    Write-Host "⚙️  View triggers: https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Failed to create trigger" -ForegroundColor Red
    exit 1
}
