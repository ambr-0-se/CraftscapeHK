# Deploy Frontend to Google Cloud Run
# This script builds and deploys the React frontend to Google Cloud Run

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Craftscape Frontend Deployment" -ForegroundColor Cyan
Write-Host "  Target: Google Cloud Run" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "craftscapehk"
$SERVICE_NAME = "craftscape-frontend"
$REGION = "us-central1"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

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

# Enable required APIs
Write-Host ""
Write-Host "Ensuring required APIs are enabled..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Get backend URL
Write-Host ""
Write-Host "Getting backend service URL..." -ForegroundColor Yellow
$BACKEND_URL = gcloud run services describe craftscape-backend --region $REGION --format="value(status.url)" 2>$null

if ([string]::IsNullOrEmpty($BACKEND_URL)) {
    Write-Host "⚠ Backend service not found. Using default URL." -ForegroundColor Yellow
    $BACKEND_URL = "https://craftscape-backend-998275462099.us-central1.run.app"
}

Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Cyan

# Build the Docker image
Write-Host ""
Write-Host "Building Docker image..." -ForegroundColor Yellow
Write-Host "Image: $IMAGE_NAME" -ForegroundColor Cyan

docker build -t $IMAGE_NAME --build-arg VITE_API_BASE_URL=$BACKEND_URL .

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Docker image built successfully" -ForegroundColor Green

# Configure Docker authentication if needed
Write-Host ""
Write-Host "Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker gcr.io --quiet 2>$null

# Push the image to Container Registry
Write-Host ""
Write-Host "Pushing image to Google Container Registry..." -ForegroundColor Yellow

docker push $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker push failed!" -ForegroundColor Red
    Write-Host "  Try running: gcloud auth configure-docker gcr.io" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Image pushed successfully" -ForegroundColor Green

# Deploy to Cloud Run
Write-Host ""
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host "Service: $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan

gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --memory 256Mi `
    --cpu 1 `
    --timeout 60s `
    --max-instances 10 `
    --port 8080

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green

# Get the service URL
Write-Host ""
Write-Host "Retrieving service URL..." -ForegroundColor Yellow
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Service Name: $SERVICE_NAME" -ForegroundColor White
Write-Host "Region:       $REGION" -ForegroundColor White
Write-Host "URL:          $SERVICE_URL" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Visit $SERVICE_URL to view your application" -ForegroundColor White
Write-Host "2. Configure custom domain (optional)" -ForegroundColor White
Write-Host "3. Set up CI/CD with Cloud Build" -ForegroundColor White
Write-Host ""
