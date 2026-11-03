mkdir -p /var/lib/ledger /usr/local/bin
cat > /usr/local/bin/ledger-writer <<'X'
#!/bin/sh
exec 3>/var/lib/ledger/today.dat
echo "ORDER-9917 paid 1200" >&3
echo "ORDER-9918 paid 450" >&3
touch /run/ledger.ready
while :; do sleep 1; done
X
chmod +x /usr/local/bin/ledger-writer
rm -f /run/ledger.ready
/usr/local/bin/ledger-writer >/dev/null 2>&1 &
n=0; while [ ! -f /run/ledger.ready ] && [ $n -lt 100 ]; do sleep 0.2; n=$((n+1)); done
rm -f /var/lib/ledger/today.dat
