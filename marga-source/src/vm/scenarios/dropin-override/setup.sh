mkdir -p /etc/systemd/system/db-sync.service.d
printf '#!/bin/sh\necho "${SYNC_MODE:-live}" > /run/dbsync.mode\nwhile :; do sleep 1; done\n' > /usr/local/bin/db-sync; chmod +x /usr/local/bin/db-sync
cat > /etc/systemd/system/db-sync.service <<'X'
[Unit]
Description=Database sync

[Service]
Environment=SYNC_MODE=live
ExecStart=/usr/local/bin/db-sync

[Install]
WantedBy=multi-user.target
X
printf '[Service]\nEnvironment=SYNC_MODE=dry-run\n' > /etc/systemd/system/db-sync.service.d/ticket-4417.conf
systemctl start db-sync >/dev/null 2>&1; true
