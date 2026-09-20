#!/usr/bin/env bash
set -e

echo "======================================================="
echo "   XYPHER Blockchain + Backend Autonomous Container   "
echo "======================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export HARDHAT_TELEMETRY=0
export CI=true
export BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"
export OPERATOR_PRIVATE_KEY="${OPERATOR_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

# Track PIDs for cleanup on shutdown
HARDHAT_PID=""
EXPRESS_PID=""

cleanup() {
  echo ""
  echo "[Shutdown] Caught signal, stopping child processes..."
  if [ -n "$EXPRESS_PID" ]; then
    echo "[Shutdown] Stopping Express server (PID $EXPRESS_PID)..."
    kill -TERM "$EXPRESS_PID" 2>/dev/null || true
  fi
  if [ -n "$HARDHAT_PID" ]; then
    echo "[Shutdown] Stopping Hardhat node (PID $HARDHAT_PID)..."
    kill -TERM "$HARDHAT_PID" 2>/dev/null || true
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM

# -------------------------------------------------------------
# STEP A: Start Hardhat Node in background
# -------------------------------------------------------------
echo "[1/6] Launching local Hardhat blockchain node in background..."
cd "$ROOT_DIR/contracts"
npx hardhat node --hostname 0.0.0.0 > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
cd "$ROOT_DIR"
echo "      Hardhat node process started (PID: $HARDHAT_PID)"

# -------------------------------------------------------------
# STEP B: Wait until Hardhat node is ready
# -------------------------------------------------------------
echo "[2/6] Polling Hardhat RPC (http://127.0.0.1:8545) until ready..."
MAX_ATTEMPTS=45
ATTEMPT=0
READY=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  # Check if Hardhat node died unexpectedly
  if ! kill -0 "$HARDHAT_PID" 2>/dev/null; then
    echo "ERROR: Hardhat node process died during startup. Recent logs:"
    cat /tmp/hardhat.log || true
    exit 1
  fi

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://127.0.0.1:8545 || true)

  if [ "$HTTP_CODE" = "200" ]; then
    READY=1
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  sleep 1
done

if [ $READY -ne 1 ]; then
  echo "ERROR: Hardhat node did not respond with 200 OK within $MAX_ATTEMPTS seconds."
  echo "Recent Hardhat logs:"
  tail -n 30 /tmp/hardhat.log || true
  exit 1
fi
echo "      ✔ Hardhat RPC is alive and accepting JSON-RPC queries."

# -------------------------------------------------------------
# STEP C: Deploy Registry.sol and CertificateRegistry.sol fresh
# -------------------------------------------------------------
echo "[3/6] Deploying fresh smart contracts to local blockchain..."
cd "$ROOT_DIR/contracts"
npx hardhat run scripts/deploy.js --network localhost
cd "$ROOT_DIR"
echo "      ✔ Smart contracts deployed successfully."

# -------------------------------------------------------------
# STEP D: Synchronize deployed contract addresses
# -------------------------------------------------------------
echo "[4/6] Synchronizing contract addresses for backend..."
node "$ROOT_DIR/scripts/sync-deployed-addresses.js"

# Source exported environment variables if generated
if [ -f "$ROOT_DIR/scripts/.deployed_env" ]; then
  source "$ROOT_DIR/scripts/.deployed_env"
fi

# -------------------------------------------------------------
# STEP E: Wipe and re-seed clean demo data
# -------------------------------------------------------------
echo "[5/6] Wiping and reseeding clean demo data via application flows..."
node "$ROOT_DIR/scripts/reseed-clean-demo-data.js"
echo "      ✔ Reseeding completed successfully."

# -------------------------------------------------------------
# STEP F: Start Express backend
# -------------------------------------------------------------
echo "[6/6] Starting Express API on port ${PORT:-5001}..."
node "$ROOT_DIR/backend/src/server.js" &
EXPRESS_PID=$!

echo "======================================================="
echo "  XYPHER Backend & Blockchain Ready to Receive Requests "
echo "======================================================="

# Keep container running and wait on Express process
wait "$EXPRESS_PID"
