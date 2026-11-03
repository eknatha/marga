mkdir -p /var/cache/app
now=$(date +%s)
for d in 30 20 12; do echo x > /var/cache/app/old-$d.dat; touch -d "@$((now - d*86400))" /var/cache/app/old-$d.dat; done
for d in 6 2 1; do echo x > /var/cache/app/new-$d.dat; touch -d "@$((now - d*86400))" /var/cache/app/new-$d.dat; done
