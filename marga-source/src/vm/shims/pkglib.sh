# MARGA teaching shim: a small imitation of apt and dpkg working on a tiny local repository. It is not apt.
# Index lines (one package per line): name|version|depends|sha256|filename|size|description
L=/var/lib/apt/lists; DB=/var/lib/dpkg; INFO=$DB/info; AR=/var/cache/apt/archives; LOCK=$DB/lock-frontend
mkdir -p $L $INFO $AR /etc/apt 2>/dev/null; [ -f $DB/status ] || : > $DB/status; [ -f $DB/holds ] || : > $DB/holds
# stanza files in a repo are "Package: x" blocks; flatten them to one line each
flatten() { awk 'BEGIN{RS="";FS="\n"} {n="";v="";d="";s="";f="";z="";x=""; for(i=1;i<=NF;i++){ if($i~/^Package: /)n=substr($i,10); else if($i~/^Version: /)v=substr($i,10); else if($i~/^Depends: /)d=substr($i,10); else if($i~/^SHA256: /)s=substr($i,9); else if($i~/^Filename: /)f=substr($i,11); else if($i~/^Size: /)z=substr($i,7); else if($i~/^Description: /)x=substr($i,14)} if(n!="")print n"|"v"|"d"|"s"|"f"|"z"|"x}'; }
allpk() { cat $L/*.idx 2>/dev/null; }
istatus() { sed -n "s/^$1|//p" $DB/status | head -1; }      # "version|state"
iver() { istatus "$1" | cut -d'|' -f1; }
istate() { istatus "$1" | cut -d'|' -f2; }
isheld() { grep -qx "$1" $DB/holds; }
vcmp() { # vcmp A OP B  (OP is >=, <=, >>, <<, =)
  a=$1; op=$2; b=$3
  if [ "$a" = "$b" ]; then case $op in '>='|'<='|'=') return 0;; *) return 1;; esac; fi
  top=$(printf '%s\n%s\n' "$a" "$b" | sort -V | tail -1)
  case $op in '>='|'>>') [ "$top" = "$a" ];; '<='|'<<') [ "$top" = "$b" ];; *) return 1;; esac; }
candidates() { allpk | awk -F'|' -v n="$1" '$1==n{print $2}' | sort -V; }
cand() { candidates "$1" | tail -1; }
indexline() { allpk | awk -F'|' -v n="$1" -v v="$2" '$1==n&&$2==v{print; exit}'; }
satisfies() { # satisfies VERSION "(>= 2.0)"
  [ -z "$2" ] && return 0; op=$(echo "$2" | sed 's/[() ]//g; s/^\([<>=]*\).*/\1/'); w=$(echo "$2" | sed 's/[() <>=]//g'); vcmp "$1" "$op" "$w"; }
lock_get() {
  if [ -f $LOCK ]; then p=$(cat $LOCK); if [ -n "$p" ] && [ "$p" != $$ ] && [ -d /proc/$p ]; then
    c=$(cat /proc/$p/comm 2>/dev/null); echo "E: Could not get lock $LOCK. It is held by process $p ($c)"; echo "E: Unable to acquire the dpkg frontend lock ($LOCK), is another process using it?"; exit 100; fi; fi
  echo $$ > $LOCK; trap 'rm -f $LOCK' EXIT; }
sources() { grep -E '^deb[ 	]' /etc/apt/sources.list /etc/apt/sources.list.d/*.list 2>/dev/null | sed 's/^[^:]*://' | awk '{print $2}'; }
