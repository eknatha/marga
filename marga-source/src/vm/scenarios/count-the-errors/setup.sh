mkdir -p /var/log/app
awk 'BEGIN{srand(11); for(i=1;i<=120;i++){ r=rand(); l="INFO"; m="request ok";
  if(r>0.55){l="WARN"; m="slow response"} if(r>0.8){l="ERROR"; m="upstream failed"} if(r<0.1){l="INFO"; m="recovered from error 17"}
  printf "2026-11-02 10:%02d:%02d %s %s id=%d\n", int(i/2)%60, i%60, l, m, i}}' > /var/log/app/app.log
