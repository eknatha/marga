mkdir -p /var/spool/mailq /var/spool/printq /var/spool/cronq /var/spool/uploadq
i=0; while [ $i -lt 700 ]; do : > /var/spool/mailq/msg-$i; i=$((i+1)); done
i=0; while [ $i -lt 12 ]; do : > /var/spool/printq/job-$i; : > /var/spool/cronq/run-$i; i=$((i+1)); done
: > /var/spool/uploadq/one
