want_n=$(awk '$9==502' /var/log/web/access.log | wc -l)
want_ip=$(awk '$9==502{print $1}' /var/log/web/access.log | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')
got_n=$(sed -n 's/^count=//p' /root/answer.txt 2>/dev/null | head -1)
got_ip=$(sed -n 's/^ip=//p' /root/answer.txt 2>/dev/null | head -1)
[ "$got_n" = "$want_n" ] && echo "PASS the number of 502 responses is right" || echo "FAIL count in /root/answer.txt is '$got_n', not the number of 502 lines"
[ "$got_ip" = "$want_ip" ] && echo "PASS the client with most 502 responses is right" || echo "FAIL ip in /root/answer.txt is '$got_ip', not the busiest 502 client"
