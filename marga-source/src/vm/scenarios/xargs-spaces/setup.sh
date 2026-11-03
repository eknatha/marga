mkdir -p "/srv/work/job 1" /srv/work/job2 "/srv/work/old runs/a b"
for f in "/srv/work/job 1/part one.tmp" "/srv/work/job 1/data.keep" /srv/work/job2/x.tmp /srv/work/job2/y.keep "/srv/work/old runs/a b/z z.tmp" /srv/work/top.tmp; do echo x > "$f"; done
