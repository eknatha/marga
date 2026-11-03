mkdir -p /var/log
i=0; while [ $i -lt 300 ]; do echo "2026-11-01 23:$((i/6%60)) INFO request ok id=$i" >> /var/log/shop.log; i=$((i+1)); done
echo "2026-11-01 23:59 WARN slow query 1204ms" >> /var/log/shop.log
echo "2026-11-02 00:00 FATAL: no space left on device while writing /var/lib/shop/cart.db" >> /var/log/shop.log
echo "2026-11-02 00:00 INFO shutting down" >> /var/log/shop.log
