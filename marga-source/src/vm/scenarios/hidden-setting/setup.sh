mkdir -p /srv/app
printf 'DEBUG=true\nAPI_URL=http://localhost:9000\nWORKERS=4\n' > /srv/app/.env
echo "app files" > /srv/app/README
