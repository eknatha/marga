mkdir -p /var/log/web
awk 'BEGIN{srand(7); split("10.0.0.5 10.0.0.9 10.0.1.17 10.0.2.40 10.0.3.8",ip," ");
 for(i=1;i<=400;i++){ c=ip[int(rand()*5)+1]; s=200; r=rand();
  if(r>0.78) s=404; if(r>0.88) s=500; if(r>0.93) s=502; if(r>0.97) s=503; if(c=="10.0.1.17" && r>0.5) s=502;
  printf "%s - - [02/Nov/2026:10:%02d:%02d] \"GET /api/item/%d HTTP/1.1\" %d %d\n", c, int(i/7)%60, i%60, i, s, 200+i}}' > /var/log/web/access.log
