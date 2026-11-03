mkdir -p /srv/exports/eu /srv/exports/us
for u in ana:1001 bruno:1002 chitra:1003; do n=${u%%:*}; i=${u##*:}; grep -q "^$n:" /etc/passwd || echo "$n:x:$i:$i::/home/$n:/bin/sh" >> /etc/passwd; done
dd if=/dev/zero of=/srv/exports/eu/q3.csv bs=1k count=300 2>/dev/null; chown ana:ana /srv/exports/eu/q3.csv 2>/dev/null || chown 1001 /srv/exports/eu/q3.csv
dd if=/dev/zero of=/srv/exports/us/dump.csv bs=1k count=2500 2>/dev/null; chown 1002:1002 /srv/exports/us/dump.csv
dd if=/dev/zero of=/srv/exports/us/q3.csv bs=1k count=700 2>/dev/null; chown 1003:1003 /srv/exports/us/q3.csv
dd if=/dev/zero of=/srv/exports/notes.txt bs=1k count=4 2>/dev/null; chown 1001:1001 /srv/exports/notes.txt
