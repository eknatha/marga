mkdir -p /etc/systemd/system
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/queue-worker; chmod +x /usr/local/bin/queue-worker
mkdir -p /usr/lib/systemd/system
cat > /usr/lib/systemd/system/queue-worker.service <<'X'
[Unit]
Description=Queue worker

[Service]
ExecStart=/usr/local/bin/queue-worker

[Install]
WantedBy=multi-user.target
X
ln -sf /dev/null /etc/systemd/system/queue-worker.service
