mkdir -p /usr/local/bin
for pair in "metrics-exporter 9101" "report-cache 9102" "feature-flags 9103"; do set -- $pair
  printf '#!/bin/sh\nwhile :; do echo ok | nc -l -p %s >/dev/null 2>&1; done\n' "$2" > /usr/local/bin/$1; chmod +x /usr/local/bin/$1
  /usr/local/bin/$1 >/dev/null 2>&1 &
done
sleep 1
