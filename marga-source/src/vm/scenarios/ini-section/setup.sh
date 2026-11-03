mkdir -p /etc/app
printf '[db]\nhost=db1\nport=5432\n\n[cache]\nhost=cache1\nport=6379\n\n[web]\nhost=0.0.0.0\nport=8080\n' > /etc/app/app.ini
