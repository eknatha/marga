mkdir -p /srv/data/logs /srv/data/media /srv/data/cache /srv/data/tmp
dd if=/dev/zero of=/srv/data/logs/a.log bs=1k count=300 2>/dev/null
dd if=/dev/zero of=/srv/data/media/v.bin bs=1k count=2400 2>/dev/null
dd if=/dev/zero of=/srv/data/cache/c.bin bs=1k count=900 2>/dev/null
dd if=/dev/zero of=/srv/data/tmp/t.bin bs=1k count=100 2>/dev/null
