mkdir -p /var/log/web
awk 'BEGIN{srand(3); for(i=1;i<=300;i++){ r=rand(); s=200; if(r>0.7)s=404; if(r>0.85)s=500; if(r>0.95)s=503;
  printf "10.0.%d.%d - - [02/Nov/2026:11:%02d:%02d +0000] \"GET /page/%d HTTP/1.1\" %d %d\n", int(rand()*4), int(rand()*200), int(i/6)%60, i%60, i, s, 100+int(rand()*900)}}' > /var/log/web/access.log
