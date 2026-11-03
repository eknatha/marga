mkdir -p /srv/site /usr/local/bin; echo "<h1>shop</h1>" > /srv/site/index.html; echo "body{}" > /srv/site/style.css
cat > /usr/local/bin/backup-site.sh <<'X'
#!/bin/sh
SRC=/srv/sitee
DEST=/backup/daily
tar czf "$DEST/site-$(date +%Y%m%d%H%M%S).tar.gz" -C "$SRC" . || { echo "backup failed" >&2; exit 1; }
echo "backup ok"
X
chmod 644 /usr/local/bin/backup-site.sh; rm -rf /backup/daily
