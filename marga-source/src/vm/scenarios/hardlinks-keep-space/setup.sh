mkdir -p /srv/store
mount -t tmpfs -o size=8m tmpfs /srv/store
mkdir -p /srv/store/a /srv/store/b /srv/store/c /srv/store/d
dd if=/dev/zero of=/srv/store/a/data.bin bs=1k count=6000 2>/dev/null
ln /srv/store/a/data.bin /srv/store/b/data.bin; ln /srv/store/a/data.bin /srv/store/c/data.bin; ln /srv/store/a/data.bin /srv/store/d/data.bin
echo "keep me" > /srv/store/keep.txt
rm /srv/store/d/data.bin
