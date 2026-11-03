mkdir -p /srv/app /usr/local/bin
echo "name: shop" > /srv/app/config.yml
printf '#!/bin/sh\ncat /srv/App/config.yml\n' > /usr/local/bin/app-info; chmod +x /usr/local/bin/app-info
