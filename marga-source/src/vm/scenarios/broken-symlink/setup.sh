mkdir -p /opt/app/releases/2024-09 /usr/local/bin
echo "2024-09" > /opt/app/releases/2024-09/VERSION
ln -s releases/2024-08 /opt/app/current
cat > /usr/local/bin/app-status <<'X'
#!/bin/sh
v=$(cat /opt/app/current/VERSION 2>/dev/null) || { echo "app-status: cannot read /opt/app/current/VERSION"; exit 1; }
echo "app-status: running release $v"
X
chmod +x /usr/local/bin/app-status
