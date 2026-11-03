mkdir -p /usr/local/bin
cat > /usr/local/bin/single-run <<'X'
#!/bin/sh
LOCK=/run/single.lock
if [ -e $LOCK ]; then echo "already running"; exit 0; fi
sleep 1
touch $LOCK
echo ran >> /run/single.log
sleep 2
rm -f $LOCK
X
chmod +x /usr/local/bin/single-run
