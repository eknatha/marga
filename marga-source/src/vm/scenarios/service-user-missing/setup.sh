mkdir -p /etc/systemd/system
grep -q '^metrics:' /etc/passwd || echo 'metrics:x:1001:1001::/var/lib/metrics:/bin/sh' >> /etc/passwd
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/metrics-agent; chmod +x /usr/local/bin/metrics-agent
cat > /etc/systemd/system/metrics-agent.service <<'X'
[Unit]
Description=Metrics agent

[Service]
User=metrics-agent
ExecStart=/usr/local/bin/metrics-agent

[Install]
WantedBy=multi-user.target
X
systemctl start metrics-agent >/dev/null 2>&1; true
