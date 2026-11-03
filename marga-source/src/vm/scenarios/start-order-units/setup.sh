mkdir -p /etc/systemd/system
printf '#!/bin/sh\ntouch /run/ordersdb.up\nwhile :; do sleep 1; done\n' > /usr/local/bin/orders-db; chmod +x /usr/local/bin/orders-db
printf '#!/bin/sh\n[ -f /run/ordersdb.up ] || { echo "database not reachable" >&2; exit 1; }\n' > /usr/local/bin/wait-for-db; chmod +x /usr/local/bin/wait-for-db
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/orders; chmod +x /usr/local/bin/orders
cat > /etc/systemd/system/orders-db.service <<'X'
[Unit]
Description=Orders database

[Service]
ExecStartPre=/bin/rm -f /run/ordersdb.up
ExecStart=/usr/local/bin/orders-db

[Install]
WantedBy=multi-user.target
X
cat > /etc/systemd/system/orders.service <<'X'
[Unit]
Description=Orders service

[Service]
ExecStartPre=/usr/local/bin/wait-for-db
ExecStart=/usr/local/bin/orders

[Install]
WantedBy=multi-user.target
X
systemctl start orders >/dev/null 2>&1; true
