out=$(su -s /bin/sh deploy -c /srv/app/run.sh 2>&1)
[ "$out" = "release published" ] && echo "PASS the deploy user can run /srv/app/run.sh" || echo "FAIL the deploy user gets: $out"
m=$(stat -c %a /srv/app/run.sh); case $m in *[2367]) echo "FAIL run.sh is writable by everyone ($m)";; *) echo "PASS run.sh is not writable by everyone ($m)";; esac
d=$(stat -c %a /srv/app); case $d in *[2367]) echo "FAIL /srv/app is writable by everyone ($d)";; *) echo "PASS /srv/app is not writable by everyone ($d)";; esac
