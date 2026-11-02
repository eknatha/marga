out=$(app-status 2>&1)
case "$out" in *"release 2024-09"*) echo "PASS app-status reports release 2024-09";; *) echo "FAIL app-status says: $out";; esac
[ -L /opt/app/current ] && echo "PASS current is still a symlink" || echo "FAIL current is no longer a symlink"
