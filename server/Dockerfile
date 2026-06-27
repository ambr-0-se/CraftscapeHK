# Use Node.js 20 on Debian (better compatibility with canvas)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install build dependencies for canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --omit=dev

# Expose Cloud Run port (Cloud Run will set PORT env var)
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start:prod"]
