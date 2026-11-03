mkdir -p /srv/data /backup
echo "TOTAL,4200" > /srv/data/ledger.csv
mount -t tmpfs -o size=1m tmpfs /srv/data
echo "fresh entry" > /srv/data/fresh.log
