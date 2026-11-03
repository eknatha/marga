mkdir -p /etc/systemd/system
printf '#!/bin/sh\necho "$*" > /run/api.args\nwhile :; do sleep 1; done\n' > /usr/local/bin/api; chmod +x /usr/local/bin/api
cat > /etc/systemd/system/api.service <<'X'
[Unit]
Description=Public API

[Service]
ExecStart=/usr/local/bin/api --port 8080
Restart=on-failure

[Install]
WantedBy=multi-user.target
X
systemctl start api >/dev/null 2>&1
sed -i 's/--port 8080/--port 9090/' /etc/systemd/system/api.service
systemctl restart api >/dev/null 2>&1; true
