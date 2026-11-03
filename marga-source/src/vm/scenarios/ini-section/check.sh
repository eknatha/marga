pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
p() { awk -v s="[$1]" '$0==s{on=1;next} /^\[/{on=0} on&&/^port=/{sub("port=","");print}' /etc/app/app.ini; }
[ "$(p db)" = "5433" ] && pass "[db] port is 5433" || fail "[db] port is '$(p db)'"
[ "$(p cache)" = "6379" ] && pass "[cache] port is still 6379" || fail "[cache] port is '$(p cache)'"
[ "$(p web)" = "8080" ] && pass "[web] port is still 8080" || fail "[web] port is '$(p web)'"
