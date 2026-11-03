pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
t "out.log has the three data lines" "out.log is missing or has the wrong lines" sh -c '[ "$(cat /root/out.log)" = "$(printf "data 1\ndata 2\ndata 3")" ]'
t "err.log has the two warnings" "err.log is missing or has the wrong lines" sh -c '[ "$(cat /root/err.log)" = "$(printf "warning: slow disk\nwarning: retrying")" ]' 
