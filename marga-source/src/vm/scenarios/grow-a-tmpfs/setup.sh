mkdir -p /var/cache/app
mount -t tmpfs -o size=2m tmpfs /var/cache/app
dd if=/dev/zero of=/var/cache/app/cache.bin bs=1k count=1900 2>/dev/null
