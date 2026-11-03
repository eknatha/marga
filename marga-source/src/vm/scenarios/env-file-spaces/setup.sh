mkdir -p /etc/app /usr/local/bin
printf 'DB_HOST = db1\nDB_PORT = 5432\n' > /etc/app/app.env
cat > /usr/local/bin/run-app <<'X'
#!/bin/sh
. /etc/app/app.env
echo "connecting to $DB_HOST:$DB_PORT"
X
chmod +x /usr/local/bin/run-app
