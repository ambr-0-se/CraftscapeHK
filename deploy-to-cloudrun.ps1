# 🚀 Quick Deploy Script for Cloud Run Hackathon (PowerShell)
# This script automates the deployment of Craftscape HK backend to Google Cloud Run

$ErrorActionPreference = "Stop"

Write-Host "🎨 Craftscape HK - Cloud Run Deployment Script" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "craftscapehk"
$SERVICE_NAME = "craftscape-backend"
$REGION = "us-central1"

# Find gcloud installation
$GCLOUD_PATH = $null
$possiblePaths = @(
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $GCLOUD_PATH = $path
        break
    }
}

# If gcloud is in PATH, use it directly
if (Get-Command gcloud -ErrorAction SilentlyContinue) {
    $GCLOUD_CMD = "gcloud"
} elseif ($GCLOUD_PATH) {
    $GCLOUD_CMD = $GCLOUD_PATH
} else {
    $GCLOUD_CMD = $null
}

# Step 1: Check prerequisites
Write-Host "📋 Step 1: Checking prerequisites..." -ForegroundColor Yellow

if (!$GCLOUD_CMD) {
    Write-Host "❌ gcloud CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   https://cloud.google.com/sdk/docs/install"
    exit 1
} else {
    Write-Host "Found gcloud at: $GCLOUD_CMD" -ForegroundColor Green
}

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Docker not found. Cloud Build will be used instead." -ForegroundColor Yellow
}

Write-Host "✅ Prerequisites OK" -ForegroundColor Green
Write-Host ""

# Step 2: Login and set project
Write-Host "🔐 Step 2: Google Cloud authentication..." -ForegroundColor Yellow

# Check if already logged in
$currentAccount = & $GCLOUD_CMD config get-value account 2>$null
if ([string]::IsNullOrEmpty($currentAccount)) {
    Write-Host "Logging in to Google Cloud..."
    & $GCLOUD_CMD auth login
} else {
    Write-Host "Already logged in as: $currentAccount" -ForegroundColor Green
}

Write-Host ""
Write-Host "Checking if project exists..." -ForegroundColor Cyan

# Check if project exists
$projectExists = & $GCLOUD_CMD projects describe $PROJECT_ID 2>$null
if (!$projectExists) {
    Write-Host "⚠️  Project '$PROJECT_ID' does not exist." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please choose an option:" -ForegroundColor Cyan
    Write-Host "1. Create new project '$PROJECT_ID' (Recommended)"
    Write-Host "2. Use an existing project"
    Write-Host "3. Exit and create project in console"
    Write-Host ""
    $choice = Read-Host "Enter your choice (1/2/3)"
    
    switch ($choice) {
        "1" {
            Write-Host "Creating project '$PROJECT_ID'..." -ForegroundColor Cyan
            & $GCLOUD_CMD projects create $PROJECT_ID --name="Craftscape HK"
            
            Write-Host ""
            Write-Host "⚠️  IMPORTANT: You need to link a billing account!" -ForegroundColor Yellow
            Write-Host "Go to: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
            Write-Host ""
            Read-Host "Press Enter after you've enabled billing..."
        }
        "2" {
            Write-Host ""
            Write-Host "Available projects:" -ForegroundColor Cyan
            & $GCLOUD_CMD projects list
            Write-Host ""
            $PROJECT_ID = Read-Host "Enter your project ID"
        }
        "3" {
            Write-Host ""
            Write-Host "Please create your project at:" -ForegroundColor Cyan
            Write-Host "https://console.cloud.google.com/projectcreate"
            Write-Host ""
            Write-Host "Then run this script again." -ForegroundColor Green
            exit 0
        }
        default {
            Write-Host "Invalid choice. Exiting." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "Setting project to: $PROJECT_ID"
& $GCLOUD_CMD config set project $PROJECT_ID

Write-Host "✅ Authentication complete" -ForegroundColor Green
Write-Host ""

# Step 3: Enable required APIs
Write-Host "🔌 Step 3: Enabling required APIs..." -ForegroundColor Yellow

& $GCLOUD_CMD services enable run.googleapis.com
& $GCLOUD_CMD services enable cloudbuild.googleapis.com
& $GCLOUD_CMD services enable artifactregistry.googleapis.com

Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Step 4: Get Gemini API key
Write-Host "🔑 Step 4: Gemini API Key configuration..." -ForegroundColor Yellow

# Check for .env file first
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Write-Host "Loading API key from .env file..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^GEMINI_API_KEY=(.+)$') {
            $GEMINI_API_KEY = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
    if (![string]::IsNullOrEmpty($GEMINI_API_KEY)) {
        Write-Host "✅ Found API key in .env" -ForegroundColor Green
    }
}

# If not in .env, check environment variable
if ([string]::IsNullOrEmpty($GEMINI_API_KEY)) {
    $GEMINI_API_KEY = $env:GEMINI_API_KEY
}

# If still not found, prompt user
if ([string]::IsNullOrEmpty($GEMINI_API_KEY)) {
    Write-Host "GEMINI_API_KEY not found in .env file or environment." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please enter your Gemini API key (it will be saved to .env):" -ForegroundColor Cyan
    $GEMINI_API_KEY = Read-Host -AsSecureString
    $GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($GEMINI_API_KEY))
    
    # Save to .env file for next time
    if (![string]::IsNullOrEmpty($GEMINI_API_KEY)) {
        Write-Host "Saving API key to .env file for future use..." -ForegroundColor Cyan
        "GEMINI_API_KEY=$GEMINI_API_KEY" | Out-File -FilePath $envFile -Encoding UTF8
        Write-Host "✅ API key saved to .env" -ForegroundColor Green
    }
}

if ([string]::IsNullOrEmpty($GEMINI_API_KEY)) {
    Write-Host "❌ Gemini API key is required!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ API key configured" -ForegroundColor Green
Write-Host ""

# Step 5: Build and deploy
Write-Host "🚀 Step 5: Deploying to Cloud Run..." -ForegroundColor Yellow

Set-Location server

& $GCLOUD_CMD run deploy $SERVICE_NAME `
  --source . `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars "GEMINI_API_KEY=$GEMINI_API_KEY,NODE_ENV=production" `
  --memory 512Mi `
  --cpu 1 `
  --timeout 300 `
  --min-instances 0 `
  --max-instances 10

Set-Location ..

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""

# Step 6: Get service URL
Write-Host "🌐 Step 6: Getting service URL..." -ForegroundColor Yellow

$SERVICE_URL = (& $GCLOUD_CMD run services describe $SERVICE_NAME `
  --platform managed `
  --region $REGION `
  --format 'value(status.url)')

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Successful!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your backend is now live at:"
Write-Host $SERVICE_URL -ForegroundColor Green

