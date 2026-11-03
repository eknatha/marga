mkdir -p /srv/apps/config /srv/apps/uploads /srv/apps/shared /srv/apps/web
echo a > /srv/apps/config/app.conf; echo b > /srv/apps/web/index.html; echo c > /srv/apps/uploads/u.txt; echo d > /srv/apps/shared/s.txt
chmod 666 /srv/apps/config/app.conf; chmod 777 /srv/apps/web/index.html; chmod 646 /srv/apps/uploads/u.txt
chmod 777 /srv/apps/config /srv/apps/uploads; chmod 755 /srv/apps/web; chmod 1777 /srv/apps/shared; chmod 644 /srv/apps/shared/s.txt
