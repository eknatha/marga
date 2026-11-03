mkdir -p /usr/local/bin
cat > /usr/local/bin/nightly-job <<'X'
#!/bin/sh
set -e
touch /run/nightly.lock
[ ! -f /run/step.fail ]
echo "step done"
rm -f /run/nightly.lock
X
chmod +x /usr/local/bin/nightly-job
touch /run/step.fail; /usr/local/bin/nightly-job >/dev/null 2>&1; rm -f /run/step.fail; true
