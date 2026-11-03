mkdir -p /etc/systemd/system /opt/reports/bin /etc/reports
echo 'REPORT_DIR=/var/reports' > /etc/reports/reports.env
printf '#!/bin/sh\n[ -n "$REPORT_DIR" ] || { echo "REPORT_DIR is not set" >&2; exit 1; }\necho "$REPORT_DIR" > /run/reports.dir\nwhile :; do sleep 1; done\n' > /opt/reports/bin/reportd; chmod +x /opt/reports/bin/reportd
cat > /etc/systemd/system/reports.service <<'X'
[Unit]
Description=Report generator

[Service]
EnvironmentFile=/etc/reports.env
ExecStart=/opt/reports/reportd

[Install]
WantedBy=multi-user.target
X
systemctl start reports >/dev/null 2>&1; true
