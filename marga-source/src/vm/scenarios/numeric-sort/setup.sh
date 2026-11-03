mkdir -p /srv/data
awk 'BEGIN{srand(33); for(i=1;i<=60;i++) print 5+int(rand()*900); print 95; print 2048; print 1020; print 9}' > /srv/data/latency.txt
