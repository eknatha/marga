# MARGA teaching shim: a small imitation of systemd's unit handling. It is not systemd.
S=/run/sd; U=/etc/systemd/system; V=/usr/lib/systemd/system; JD=/var/log/journal
mkdir -p $S $JD $U/multi-user.target.wants 2>/dev/null
unit_file() { if [ -L "$U/$1.service" ] && [ "$(readlink "$U/$1.service")" = /dev/null ]; then echo MASKED; elif [ -f "$U/$1.service" ]; then echo "$U/$1.service"; elif [ -f "$V/$1.service" ]; then echo "$V/$1.service"; fi; }
unit_text() { f=$(unit_file "$1"); [ -n "$f" ] && [ "$f" != MASKED ] || return 1; cat "$f"; for d in "$U/$1.service.d"/*.conf; do [ -f "$d" ] && { echo; cat "$d"; }; done; return 0; }
snap() { unit_text "$1" > "$S/$1.loaded" 2>/dev/null; }
changed() { [ -f "$S/$1.loaded" ] && ! unit_text "$1" 2>/dev/null | cmp -s - "$S/$1.loaded"; }
cget() { sed -n "s/^$2[ ]*=[ ]*//p" "$S/$1.loaded" | tail -1 | sed 's/[ ]*$//'; }
cgetall() { sed -n "s/^$2[ ]*=[ ]*//p" "$S/$1.loaded"; }
setstate() { echo "$2" > "$S/$1.state"; }
getstate() { cat "$S/$1.state" 2>/dev/null || echo inactive; }
jlog() { echo "$(date '+%b %d %H:%M:%S') marga-lab $2: $3" >> "$JD/$1.log"; }
alive() { [ -n "$1" ] && [ -d "/proc/$1" ] && ! grep -q '^State:.*Z' "/proc/$1/status" 2>/dev/null; }
mainpid() { cat "$S/$1.main" 2>/dev/null; }
running() { p=$(mainpid "$1"); alive "$p" && [ "$(getstate "$1")" = active ]; }
supervisor_alive() { p=$(cat "$S/$1.sup" 2>/dev/null); alive "$p"; }
