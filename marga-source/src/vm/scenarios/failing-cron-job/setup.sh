for d in 28 29 30 31; do for j in backup-db rotate-logs nightly-export prune-tmp; do rc=0; [ $j = nightly-export ] && rc=1; echo "2026-10-$d 02:00 $j rc=$rc" >> /var/log/cron-jobs.log; done; done
