mkdir -p /srv/downloads; cd /srv/downloads
for f in app-1.0.tar.gz app-1.1.tar.gz app-1.2.tar.gz; do dd if=/dev/urandom of=$f bs=1k count=20 2>/dev/null; done
sha256sum app-1.0.tar.gz app-1.1.tar.gz app-1.2.tar.gz > SHA256SUMS
printf 'X' >> app-1.1.tar.gz
