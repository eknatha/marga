mkdir -p /usr/local/bin /var/log
for w in a b c; do
  f=/var/log/$w.log; [ $w = b ] && f=/var/log/mystery.log
  printf '#!/bin/sh\nexec 3>>%s\nwhile :; do echo tick >&3; sleep 1; done\n' "$f" > /usr/local/bin/writer-$w
  chmod +x /usr/local/bin/writer-$w
  /usr/local/bin/writer-$w >/dev/null 2>&1 &
done
sleep 1
