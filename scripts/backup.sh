#!/bin/bash
# Backup nightly de la base Crowdfunding Tracker — rotation 7 jours.
# Copie cohérente via l'API backup de sqlite3 (pas de cp brut pendant écriture).
# Le python tourne DANS le container → chemin conteneur (/app/data = bind mount ./data).
# Cron suggéré : 30 3 * * * /opt/crowdfunding-tracker/scripts/backup.sh
set -e
BK_HOST=/opt/crowdfunding-tracker/data/backups
BK_CT=/app/data/backups
mkdir -p "$BK_HOST"
DATE=$(date +%F)
sudo docker exec -i crowdfunding-tracker python3 - "$BK_CT" "$DATE" <<'PY'
import sqlite3, sys, os
bk, d = sys.argv[1], sys.argv[2]
os.makedirs(bk, exist_ok=True)
dst = os.path.join(bk, f"app-{d}.db")
src = sqlite3.connect('/app/data/app.db')
out = sqlite3.connect(dst)
src.backup(out)
out.close()
src.close()
print("backup ok:", dst)
PY
# rotation : garder les 7 plus récents (côté host, le bind mount reflète le conteneur)
ls -1t "$BK_HOST"/app-*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
