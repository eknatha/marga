mkdir -p /srv/records
mount -t tmpfs -o size=2m tmpfs /srv/records
echo "entry 1: opening balance" > /srv/records/ledger
mount -o remount,ro /srv/records
