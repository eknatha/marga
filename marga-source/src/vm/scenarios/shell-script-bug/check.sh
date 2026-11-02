rm -rf /backup/*
out=$(backup.sh "/srv/my data" 2>&1); rc=$?
[ $rc -eq 0 ] && [ -f "/backup/my data/file.txt" ] && echo "PASS a folder with a space in its name is backed up" || echo "FAIL backup of '/srv/my data' failed (exit $rc)"
out=$(backup.sh /srv/missing 2>&1); rc=$?
[ $rc -ne 0 ] && echo "PASS a missing source gives a non-zero exit status" || echo "FAIL a missing source still exits 0"
case "$out" in *"finished OK"*) echo "FAIL the script claims success for a missing source";; *) echo "PASS the script does not claim success for a missing source";; esac
