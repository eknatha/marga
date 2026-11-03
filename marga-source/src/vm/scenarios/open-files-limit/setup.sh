mkdir -p /usr/local/bin /run
cat > /usr/local/bin/worker <<'X'
#!/bin/sh
n=$(ulimit -n)
if [ "$n" -lt 256 ]; then echo "worker: Too many open files (limit $n)" > /run/worker.status; exit 1; fi
echo "worker: ok (limit $n)" > /run/worker.status
while :; do sleep 1; done
X
cat > /usr/local/bin/start-worker <<'X'
#!/bin/sh
ulimit -n 64
/usr/local/bin/worker >/dev/null 2>&1 &
X
chmod +x /usr/local/bin/worker /usr/local/bin/start-worker
start-worker; sleep 1
