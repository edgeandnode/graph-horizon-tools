#!/bin/bash
# Queues reallocate actions (up to BATCH_SIZE)

set -e

# Configuration
NETWORK="${NETWORK:-arbitrum-one}"
BATCH_SIZE="${BATCH_SIZE:-1}"
ALLOCATIONS_FILE="${ALLOCATIONS_FILE:-allocations.json}"
SOURCE="${SOURCE:-horizon-bulk-reallocate}"
REASON="horizon-reallocation"
SKIPPED_INACTIVE_LOG="${SKIPPED_INACTIVE_LOG:-skipped-inactive.log}"
QUEUED_DEPLOYMENTS_LOG="${QUEUED_DEPLOYMENTS_LOG:-queued-deployments.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if deployment is active via graphman
# Note: graphman returns exit code 139 even on success, so we ignore the exit code
is_deployment_active() {
    local deployment="$1"
    local output
    output=$(graphman info "$deployment" 2>/dev/null)
    echo "$output" | grep -q "Active.*true"
}

echo -e "${YELLOW}=== Queue Reallocate Actions ===${NC}"
echo "Network: $NETWORK"
echo "Batch size: $BATCH_SIZE"
echo "Allocations file: $ALLOCATIONS_FILE"
echo "Skipped log: $SKIPPED_INACTIVE_LOG"
echo ""

# Check if allocations file exists
if [[ ! -f "$ALLOCATIONS_FILE" ]]; then
    echo -e "${RED}Error: Allocations file not found. Please provide a valid file path.${NC}"
    exit 1
fi

# Build list of previously skipped deployments
if [[ -f "$SKIPPED_INACTIVE_LOG" ]]; then
    SKIPPED_DEPLOYMENTS=$(cut -f1 "$SKIPPED_INACTIVE_LOG" | sort -u | jq -R -s 'split("\n") | map(select(length > 0))')
else
    SKIPPED_DEPLOYMENTS="[]"
fi

# Get legacy allocations, excluding previously skipped, up to BATCH_SIZE
BATCH_ALLOCS=$(jq --argjson skipped "$SKIPPED_DEPLOYMENTS" \
    '[.[] | select(.isLegacy == "Yes" and (.subgraphDeployment as $dep | $skipped | index($dep) | not))][0:'"$BATCH_SIZE"']' \
    "$ALLOCATIONS_FILE")
BATCH_COUNT=$(echo "$BATCH_ALLOCS" | jq length)

echo "Queueing $BATCH_COUNT allocations..."
echo ""

# Clear queued deployments log for this batch
> "$QUEUED_DEPLOYMENTS_LOG"

# Queue each allocation
echo "$BATCH_ALLOCS" | jq -c '.[]' | while read -r alloc; do
    DEPLOYMENT=$(echo "$alloc" | jq -r '.subgraphDeployment')
    ALLOC_ID=$(echo "$alloc" | jq -r '.id')
    AMOUNT=$(echo "$alloc" | jq -r '.allocatedTokens')

    echo -n "  $ALLOC_ID... "

    # Check if deployment is active before queueing
    if ! is_deployment_active "$DEPLOYMENT"; then
        echo -e "${YELLOW}SKIPPED (deployment not active)${NC}"
        echo -e "$DEPLOYMENT\t$ALLOC_ID" >> "$SKIPPED_INACTIVE_LOG"
        continue
    fi

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
        echo -e "${GREEN}QUEUED${NC}"
        echo "$DEPLOYMENT" >> "$QUEUED_DEPLOYMENTS_LOG"
    else
        echo -e "${RED}FAILED${NC}"
    fi
done

# Count total skipped from log file
TOTAL_SKIPPED=$(grep -c . "$SKIPPED_INACTIVE_LOG" 2>/dev/null || echo 0)

echo ""
echo -e "${GREEN}=== Done! ===${NC}"
echo "Processed: $BATCH_COUNT"
if [[ "$TOTAL_SKIPPED" -gt 0 ]]; then
    echo -e "${YELLOW}Total inactive (excluded from batches): $TOTAL_SKIPPED (see $SKIPPED_INACTIVE_LOG)${NC}"
fi
echo "Use status.sh to check progress."
