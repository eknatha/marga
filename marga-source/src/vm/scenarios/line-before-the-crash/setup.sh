mkdir -p /var/log/app
awk 'BEGIN{for(i=1;i<=40;i++){ printf "10:%02d:01 REQ-%d start\n10:%02d:02 REQ-%d done\n", i, 1000+i, i, 1000+i }
 printf "10:41:01 REQ-1041 start\n10:41:02 kernel: app[311]: segfault at 0 ip 0000 sp 0000 error 4\n";
 for(i=42;i<=50;i++) printf "10:%02d:01 REQ-%d start\n10:%02d:02 REQ-%d done\n", i, 1000+i, i, 1000+i }' > /var/log/app/crash.log
