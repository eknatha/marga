mkdir -p /srv/vm
rm -f /srv/vm/disk.img
truncate -s 200M /srv/vm/disk.img
dd if=/dev/urandom of=/srv/vm/disk.img bs=1k count=300 conv=notrunc 2>/dev/null
