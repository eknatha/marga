pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
t "the backup file exists" "/backup/site.tar.gz is missing" test -s /backup/site.tar.gz
t "it holds index.html" "index.html is not in the archive" sh -c 'tar tzf /backup/site.tar.gz | grep -q "index.html$"'
t "it holds style.css" "css/style.css is not in the archive" sh -c 'tar tzf /backup/site.tar.gz | grep -q "style.css$"'
t "the site is untouched" "/srv/site was changed" test -f /srv/site/index.html
