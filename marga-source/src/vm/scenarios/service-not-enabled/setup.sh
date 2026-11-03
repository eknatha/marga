mkdir -p /etc/systemd/system
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/billing; chmod +x /usr/local/bin/billing
cat > /etc/systemd/system/billing.service <<'X'
[Unit]
Description=Billing worker

[Service]
ExecStart=/usr/local/bin/billing
Restart=on-failure

[Install]
WantedBy=multi-user.target
X
systemctl start billing >/dev/null 2>&1; true
