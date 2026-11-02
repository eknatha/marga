mkdir -p /usr/local/bin "/srv/my data" /backup
echo "row" > "/srv/my data/file.txt"
cat > /usr/local/bin/backup.sh <<'X'
#!/bin/sh
SRC=$1
DEST=/backup
cp -r $SRC $DEST/
echo "backup finished OK"
X
chmod +x /usr/local/bin/backup.sh
