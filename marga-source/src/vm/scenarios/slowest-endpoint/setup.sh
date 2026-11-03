i=0; while [ $i -lt 240 ]; do case $((i%4)) in 0) p=/home; t=$((20+i%9));; 1) p=/api/items; t=$((40+i%13));; 2) p=/api/search; t=$((300+i%40));; 3) p=/static/app.js; t=$((8+i%5));; esac
 [ $((i%7)) = 0 ] && { p=/api/search; t=$((900+i)); }
 echo "GET $p 200 $t" >> /var/log/access.log; i=$((i+1)); done
j=0; while [ $j -lt 160 ]; do echo "GET /home 200 $((15+j%11))" >> /var/log/access.log; j=$((j+1)); done
