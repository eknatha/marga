mkdir -p /etc/app /usr/local/bin
printf 'a=0\nb=0\nc=0\n' > /etc/app/live.conf
cat > /usr/local/bin/update-conf <<'X'
#!/bin/sh
OUT=/etc/app/live.conf
: > "$OUT"
sleep 1
printf 'a=1\nb=2\nc=3\n' >> "$OUT"
X
chmod +x /usr/local/bin/update-conf
