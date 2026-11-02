cat > /etc/hosts <<'X'
127.0.0.1 localhost
127.0.1.1 marga-lab
10.9.9.9 db-internal
X
cat > /usr/local/bin/db-check <<'X'
#!/bin/sh
ip=$(getent hosts db.internal 2>/dev/null | awk '{print $1}')
[ -z "$ip" ] && ip=$(grep -E '[[:space:]]db\.internal([[:space:]]|$)' /etc/hosts | awk '{print $1}')
if [ -z "$ip" ]; then echo "db-check: cannot resolve db.internal"; exit 1; fi
echo "db-check: db.internal is $ip"
X
chmod +x /usr/local/bin/db-check
