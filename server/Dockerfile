# Build from repository root:
#   docker build -f server/Dockerfile -t craftscape-backend .
#
# Cloud Run deploy should use repo root as source with --dockerfile server/Dockerfile
# so the shared contracts package is available to the backend build.

FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY shared/package.json shared/tsconfig.build.json shared/contracts.ts shared/ownership.ts ./shared/
COPY server/package.json server/package-lock.json ./server/

WORKDIR /app/server
RUN npm ci

COPY server/nest-cli.json server/tsconfig.json ./
COPY server/src ./src

# Runtime assets loaded by path (NOT bundled into dist):
#  - assets/mahjong/*.ttf  -> registerFont() in utils/text-to-image.util.ts
#  - constants.cjs         -> require('../constants.cjs') in seed + admin.service (boot seed)
# Without these the container renders wrong mahjong glyphs and boots an EMPTY database.
COPY server/assets ./assets
COPY server/constants.cjs ./constants.cjs

RUN npm run build
RUN npm prune --omit=dev

EXPOSE 8080
CMD ["npm", "run", "start:prod"]
