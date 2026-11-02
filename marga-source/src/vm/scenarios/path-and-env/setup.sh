mkdir -p /opt/tools/bin /usr/local/bin
cat > /opt/tools/bin/deploytool <<'X'
#!/bin/sh
[ "$APP_ENV" = "staging" ] || { echo "deploytool: APP_ENV is not set to staging"; exit 1; }
echo "deploytool 2.4 ready for staging"
X
chmod +x /opt/tools/bin/deploytool
rm -f /root/.profile
