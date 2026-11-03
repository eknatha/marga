mkdir -p /usr/local/bin
cat > /usr/local/bin/noisy <<'X'
#!/bin/sh
echo "data 1"; echo "warning: slow disk" >&2
echo "data 2"; echo "data 3"; echo "warning: retrying" >&2
X
chmod +x /usr/local/bin/noisy
