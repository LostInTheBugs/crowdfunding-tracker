#!/bin/bash
# Auto-update Crowdfunding Tracker : suit les tags GitHub (deploy key lecture seule).
# Un tag vYYYY.MM.NNN plus récent que le HEAD → checkout + rebuild docker.
# Cron suggéré : 17 * * * * /opt/crowdfunding-tracker/scripts/update.sh
set -e
cd /opt/crowdfunding-tracker
export GIT_SSH_COMMAND="ssh -i /opt/crowdfunding-tracker/.deploy_key -o StrictHostKeyChecking=accept-new"
LOG=/opt/crowdfunding-tracker/data/updates.log
mkdir -p "$(dirname "$LOG")"
git fetch --tags --force origin 2>>"$LOG" || exit 0
LATEST=$(git tag --sort=-v:refname | head -1)
[ -z "$LATEST" ] && exit 0
CURRENT=$(git describe --tags --exact-match HEAD 2>/dev/null || echo none)
if [ "$LATEST" != "$CURRENT" ]; then
  echo "$(date '+%F %T') : update $CURRENT -> $LATEST" >> "$LOG"
  git checkout -f "$LATEST" >> "$LOG" 2>&1
  sudo docker compose -f docker-compose.lan.yml up -d --build >> "$LOG" 2>&1
  echo "$(date '+%F %T') : done" >> "$LOG"
fi
