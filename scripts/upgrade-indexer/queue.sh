#!/bin/bash
# Queues reallocate actions (up to BATCH_SIZE)

set -e

# Configuration
NETWORK="${NETWORK:-arbitrum-one}"
BATCH_SIZE="${BATCH_SIZE:-1}"
ALLOCATIONS_FILE="${ALLOCATIONS_FILE:-allocations.json}"
SOURCE="${SOURCE:-horizon-bulk-reallocate}"
REASON="horizon-reallocation"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Queue Reallocate Actions ===${NC}"
echo "Network: $NETWORK"
echo "Batch size: $BATCH_SIZE"
echo "Allocations file: $ALLOCATIONS_FILE"
echo ""

# Check if allocations file exists
if [[ ! -f "$ALLOCATIONS_FILE" ]]; then
    echo -e "${RED}Error: Allocations file not found. Please provide a valid file path.${NC}"
    exit 1
fi

# Get legacy allocations (up to BATCH_SIZE)
BATCH_ALLOCS=$(jq '[.[] | select(.isLegacy == "Yes")][0:'"$BATCH_SIZE"']' "$ALLOCATIONS_FILE")
BATCH_COUNT=$(echo "$BATCH_ALLOCS" | jq length)

echo "Queueing $BATCH_COUNT allocations..."
echo ""

# Queue each allocation
echo "$BATCH_ALLOCS" | jq -c '.[]' | while read -r alloc; do
    DEPLOYMENT=$(echo "$alloc" | jq -r '.subgraphDeployment')
    ALLOC_ID=$(echo "$alloc" | jq -r '.id')
    AMOUNT=$(echo "$alloc" | jq -r '.allocatedTokens')

    echo -n "  Queueing $ALLOC_ID... "

    if graph indexer actions queue reallocate \
        "$DEPLOYMENT" \
        "$ALLOC_ID" \
        "$AMOUNT" \
        0x0 \
        true \
        0 \
        0x0 \
        --network "$NETWORK" \
        --source "$SOURCE" \
        --reason "$REASON" \
        -o json 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
done

echo ""
echo -e "${GREEN}=== Done! ===${NC}"
echo "Queued $BATCH_COUNT allocations. Use status.sh to check progress."
