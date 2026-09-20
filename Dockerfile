# ------------------------------------------------------------------------------
# Production Dockerfile for XYPHER Backend + Self-Contained Blockchain Node
# Designed for Render container deployment with automated reset & reseed on start
# ------------------------------------------------------------------------------

FROM node:20-bookworm-slim

# Install system dependencies: curl (for RPC polling & healthchecks), bash
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Application directory
WORKDIR /app

# Non-interactive / CI environment flags
ENV HARDHAT_TELEMETRY=0
ENV CI=true
ENV NODE_ENV=production
ENV PORT=5001
ENV BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545

# Copy workspace package manifests first to optimize Docker layer caching
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY contracts/package.json ./contracts/
COPY frontend/package.json ./frontend/

# Install all workspace dependencies (including contracts tooling & backend)
# Note: omit=dev is NOT used because Hardhat is a required runtime in this container
RUN npm install

# Copy application source code
COPY backend ./backend
COPY contracts ./contracts
COPY scripts ./scripts

# Pre-compile Solidity smart contracts so artifacts and ABIs are ready
RUN npm run compile --workspace=contracts

# Make startup script executable
RUN chmod +x /app/scripts/start-container.sh

# Expose backend API and local blockchain RPC
EXPOSE 5001 8545

# Start self-contained blockchain, deploy, reseed, and launch Express
CMD ["/bin/bash", "/app/scripts/start-container.sh"]
