mkdir -p /etc/systemd/system /opt/ledger/bin
printf '#!/bin/sh\necho "ledger: started"\nwhile :; do sleep 1; done\n' > /opt/ledger/bin/ledgerd; chmod +x /opt/ledger/bin/ledgerd
cat > /etc/systemd/system/ledger.service <<'X'
[Unit]
Description=Ledger daemon

[Service]
ExecStart=/opt/ledger/ledgerd

[Install]
WantedBy=multi-user.target
X
systemctl start ledger >/dev/null 2>&1; true
