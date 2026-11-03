mkdir -p /srv/uploads/incoming /usr/local/bin
grep -q '^www:' /etc/passwd || echo 'www:x:1100:1100::/srv:/bin/sh' >> /etc/passwd
echo 'DIR=/srv/upload' > /etc/uploader.conf
cat > /usr/local/bin/store-upload <<'X'
#!/bin/sh
. /etc/uploader.conf
f="$DIR/upload-$$.dat"
echo data > "$f" 2>/dev/null && echo "OK: stored $f" || { echo "store-upload: cannot write to $DIR" >&2; exit 1; }
X
chmod +x /usr/local/bin/store-upload
chown root:root /srv/uploads/incoming; chmod 755 /srv/uploads/incoming; chmod 700 /srv
