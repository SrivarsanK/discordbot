#!/usr/bin/env bash
# ============================================================
#  update-and-start.sh
#  Linux/macOS equivalent of update-and-start.ps1
#  Checks GitHub for new commits -> pulls if behind ->
#  npm install if package.json changed -> starts the bot
#
#  Usage:  bash update-and-start.sh
#          ./update-and-start.sh          (after chmod +x)
# ============================================================

set -euo pipefail

REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-}"

# -- Colours -------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; GRAY='\033[0;90m'; RESET='\033[0m'; BOLD='\033[1m'

step()  { echo -e "${CYAN}  >> $1${RESET}"; }
ok()    { echo -e "${GREEN}  OK $1${RESET}"; }
warn()  { echo -e "${YELLOW}  !! $1${RESET}"; }
err()   { echo -e "${RED}  XX $1${RESET}"; }

# -- Resolve script directory --------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}===========================================${RESET}"
echo -e "${BOLD}  DSC SRM RMP Bot - Auto Update & Start   ${RESET}"
echo -e "${GRAY}  $(date '+%Y-%m-%d %H:%M:%S')${RESET}"
echo -e "${BOLD}===========================================${RESET}"
echo ""

# -- 1. Determine branch -------------------------------------
if [ -z "$BRANCH" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
fi
step "Branch: $BRANCH | Remote: $REMOTE"

# -- 2. Fetch without merging --------------------------------
step "Fetching $REMOTE/$BRANCH..."
if ! git fetch "$REMOTE" "$BRANCH" --quiet 2>/dev/null; then
    warn "git fetch failed — check network/SSH keys. Starting with local code."
    npm start
    exit 0
fi

# -- 3. Compare hashes ---------------------------------------
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse "$REMOTE/$BRANCH")

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    ok "Already up to date (${LOCAL_HASH:0:7}). No pull needed."
else
    COMMIT_COUNT=$(git rev-list HEAD.."$REMOTE/$BRANCH" --count)
    warn "$COMMIT_COUNT new commit(s) available:"
    git log HEAD.."$REMOTE/$BRANCH" --oneline --no-color | while IFS= read -r line; do
        echo -e "${GRAY}    $line${RESET}"
    done

    # Check if package.json changed in incoming commits
    PKG_CHANGED=$(git diff HEAD "$REMOTE/$BRANCH" -- package.json --name-only)

    # 3a. Pull
    step "Pulling changes..."
    git pull "$REMOTE" "$BRANCH" --rebase 2>&1 | while IFS= read -r line; do
        echo -e "${GRAY}    $line${RESET}"
    done

    NEW_HASH=$(git rev-parse HEAD)
    ok "Updated to ${NEW_HASH:0:7}"

    # 3b. npm install only if needed
    if [ -n "$PKG_CHANGED" ]; then
        step "package.json changed — running npm install..."
        npm install --prefer-offline 2>&1 | while IFS= read -r line; do
            echo -e "${GRAY}    $line${RESET}"
        done
        ok "Dependencies installed."
    else
        ok "package.json unchanged — skipping npm install."
    fi
fi

# -- 4. Start the bot ----------------------------------------
echo ""
step "Starting bot (npm start)..."
echo ""
exec npm start
