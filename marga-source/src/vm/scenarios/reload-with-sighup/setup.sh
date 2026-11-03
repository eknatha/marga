mkdir -p /usr/local/bin /run
echo 'GREETING="hello v1"' > /etc/webd.conf
cat > /usr/local/bin/webd <<'X'
#!/bin/sh
echo $$ > /run/webd.pid
cp /run/webd.pid /run/webd.orig
load() { . /etc/webd.conf; echo "$GREETING" > /run/webd.state; }
load
trap load HUP
while :; do sleep 1; done
X
chmod +x /usr/local/bin/webd
/usr/local/bin/webd >/dev/null 2>&1 &
sleep 1
