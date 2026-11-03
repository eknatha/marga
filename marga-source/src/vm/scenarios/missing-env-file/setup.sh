mkdir -p /etc/systemd/system /etc/payments/env.d
echo 'PAY_MODE=live' > /etc/payments/env.d/payments.env
printf '#!/bin/sh\n[ -n "$PAY_MODE" ] || { echo "PAY_MODE is not set" >&2; exit 1; }\necho "$PAY_MODE" > /run/payments.mode\nwhile :; do sleep 1; done\n' > /usr/local/bin/payments; chmod +x /usr/local/bin/payments
cat > /etc/systemd/system/payments.service <<'X'
[Unit]
Description=Payments worker

[Service]
EnvironmentFile=/etc/payments/payments.env
ExecStart=/usr/local/bin/payments

[Install]
WantedBy=multi-user.target
X
systemctl start payments >/dev/null 2>&1; true
