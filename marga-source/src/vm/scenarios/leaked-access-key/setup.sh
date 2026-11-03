mkdir -p /srv/app/src /srv/app/old /srv/app/docs
echo 'port = 8080' > /srv/app/src/config.ini
echo 'print("hello")' > /srv/app/src/main.py
echo 'See the README for setup.' > /srv/app/docs/README.md
printf 'host=db.internal\naws_access_key_id=AKIAIOSFODNN7EXAMPLE\n' > /srv/app/old/settings.bak
echo 'old notes' > /srv/app/old/notes.txt
