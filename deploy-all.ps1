# Deploy Both Frontend and Backend to Google Cloud Run
# Uses Cloud Build to deploy both services with substitution variables

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Craftscape Full Stack Deployment" -ForegroundColor Cyan
Write-Host "  Target: Google Cloud Run" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "craftscapehk"

# Load environment variables from .env file
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim('"', "'")
            Set-Item -Path "env:$key" -Value $value
        }
    }
    Write-Host "✓ Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
}

# Get API keys from environment
$GEMINI_API_KEY = $env:GEMINI_API_KEY

# Validate required variables
if ([string]::IsNullOrWhiteSpace($GEMINI_API_KEY)) {
    Write-Host "✗ Error: GEMINI_API_KEY not found in environment" -ForegroundColor Red
    Write-Host "  Please set it in your .env file or environment" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Project ID:        $PROJECT_ID" -ForegroundColor White
Write-Host "  GEMINI_API_KEY:    $($GEMINI_API_KEY.Substring(0, 15))..." -ForegroundColor White
Write-Host ""

# Check if gcloud is installed
Write-Host "Checking gcloud installation..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud version 2>&1 | Select-String -Pattern "Google Cloud SDK"
    Write-Host "✓ gcloud is installed: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ gcloud is not installed. Please install Google Cloud SDK first." -ForegroundColor Red
    Write-Host "  Visit: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set the project
Write-Host ""
Write-Host "Setting project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Build substitutions string
$substitutions = "_GEMINI_API_KEY=$GEMINI_API_KEY"

# Submit build to Cloud Build
Write-Host ""
Write-Host "Submitting build to Cloud Build..." -ForegroundColor Yellow
Write-Host "This will:" -ForegroundColor Cyan
Write-Host "  1. Build backend Docker image" -ForegroundColor White
Write-Host "  2. Build frontend Docker image" -ForegroundColor White
Write-Host "  3. Push both images to GCR" -ForegroundColor White
Write-Host "  4. Deploy backend to Cloud Run" -ForegroundColor White
Write-Host "  5. Deploy frontend to Cloud Run" -ForegroundColor White
Write-Host "  6. Seed the database" -ForegroundColor White
Write-Host ""

Write-Host "Starting Cloud Build..." -ForegroundColor Yellow

gcloud builds submit --config=cloudbuild.yaml --substitutions=$substitutions

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Cloud Build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Check build logs: gcloud builds list --limit=1" -ForegroundColor White
    Write-Host "2. View detailed logs: gcloud builds log <BUILD_ID>" -ForegroundColor White
    Write-Host "3. Verify API keys are correct" -ForegroundColor White
    Write-Host "4. Ensure Cloud Build has proper permissions" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "✓ Cloud Build completed successfully!" -ForegroundColor Green

# Get service URLs
Write-Host ""
Write-Host "Retrieving service URLs..." -ForegroundColor Yellow

$BACKEND_URL = gcloud run services describe craftscape-backend --region us-central1 --format="value(status.url)" 2>$null
$FRONTEND_URL = gcloud run services describe craftscape-frontend --region us-central1 --format="value(status.url)" 2>$null

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Backend Service:" -ForegroundColor White
Write-Host "  URL:     $BACKEND_URL" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend Service:" -ForegroundColor White
Write-Host "  URL:     $FRONTEND_URL" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit $FRONTEND_URL to view your application" -ForegroundColor White
Write-Host "2. Test API: $BACKEND_URL/api/crafts" -ForegroundColor White
Write-Host "3. View logs: gcloud run services logs read [SERVICE_NAME] --region us-central1" -ForegroundColor White
Write-Host "4. Monitor: https://console.cloud.google.com/run?project=$PROJECT_ID" -ForegroundColor White
Write-Host ""

Write-Host "✓ Deployment complete!" -ForegroundColor Green
