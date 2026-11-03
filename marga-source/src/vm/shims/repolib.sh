# Helpers a package lab uses at boot to build its small local repository (served by httpd on 127.0.0.1)
R=/srv/repo
pk_reset() { mkdir -p /var/lib/apt/lists /var/lib/dpkg/info /var/cache/apt/archives /etc/apt; rm -rf /var/lib/apt/lists/* /var/lib/dpkg/info/* /var/cache/apt/archives* /etc/apt/sources.list.d; : > /var/lib/dpkg/status; : > /var/lib/dpkg/holds; rm -f /var/lib/dpkg/lock-frontend; mkdir -p /var/cache/apt/archives /etc/apt/sources.list.d; }
pk_init() { [ -z "${PK_DONE:-}" ] && { pk_reset; PK_DONE=1; }; rm -rf $R /tmp/pk; mkdir -p $R/pool /tmp/pk; : > $R/Packages.new; }
# pk_pkg NAME VERSION "Depends text" "Description"   (payload lines "path|content" on stdin; POSTINST env = script text)
pk_pkg() {
  d=/tmp/pk/$1_$2; rm -rf $d; mkdir -p $d
  while IFS='|' read -r p c; do [ -z "$p" ] && continue; mkdir -p "$d$(dirname "$p")"; printf '%s\n' "$c" > "$d$p"; done
  [ -n "${POSTINST:-}" ] && { mkdir -p $d/.marga; printf '%s\n' "$POSTINST" > $d/.marga/postinst; }
  [ -z "$(ls -A $d)" ] && { mkdir -p $d/usr/share/doc/$1; echo "$1 $2" > $d/usr/share/doc/$1/README; }
  ( cd $d && tar czf $R/pool/$1_$2.pkg . ) || return 1
  s=$(sha256sum $R/pool/$1_$2.pkg | cut -d' ' -f1); z=$(wc -c < $R/pool/$1_$2.pkg)
  { echo "Package: $1"; echo "Version: $2"; [ -n "$3" ] && echo "Depends: $3"; echo "SHA256: $s"; echo "Filename: pool/$1_$2.pkg"; echo "Size: $z"; echo "Description: $4"; echo; } >> $R/Packages.new
  POSTINST=""; }
pk_publish() { mv $R/Packages.new $R/Packages; }
pk_serve() { httpd -f -p 127.0.0.1:${1:-8090} -h $R >/dev/null 2>&1 & }
# pk_installed NAME VERSION  -> record a package as already installed (files list given on stdin, created empty)
pk_installed() { mkdir -p /var/lib/dpkg/info; echo "$1|$2|installed" >> /var/lib/dpkg/status; : > /var/lib/dpkg/info/$1.list
  while read -r f; do [ -z "$f" ] && continue; echo "$f" >> /var/lib/dpkg/info/$1.list; done; }
