/* MARGA cloud compare: the same job done in AWS and in Azure, side by side, with the lab that practises it.
   A fixed table written by hand. No network. Commands are the ones the simulated labs accept. */
window.MargaCloudCompare = function (A) {
'use strict';
var e = A.e, $ = A.$;
var ROWS = [
  ['Who am I', 'Identity', 'aws sts get-caller-identity', 'az account show', 'AWS shows an account and a role or user. Azure shows a subscription and a signed-in user. Check this before any change.', 'cl-aws-wrong-profile', 'Wrong profile'],
  ['List storage', 'Storage', 'aws s3 ls', 'az storage account list -o table', 'S3 buckets live in one global namespace. Azure storage accounts hold containers, and sit inside a resource group.', 'cl-aws-account-bucket', 'Find a bucket'],
  ['Make storage private', 'Storage', 'aws s3api put-public-access-block --bucket NAME --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true', 'az storage account update -n NAME -g GROUP --allow-blob-public-access false', 'AWS needs four switches; Azure has one account setting. Both close the door at the account or bucket level, not file by file.', 'cl-aws-public-bucket', 'Public bucket'],
  ['Keep old file versions', 'Storage', 'aws s3api put-bucket-versioning --bucket NAME --versioning-configuration Status=Enabled', 'az storage account blob-service-properties update -n NAME -g GROUP --enable-versioning true', 'Versioning keeps every overwrite. It protects against mistakes and also adds storage cost.', 'cl-aws-versioning', 'Turn on versioning'],
  ['List servers', 'Compute', 'aws ec2 describe-instances', 'az vm list -o table', 'AWS prints nested JSON by reservation. Azure lists VMs flat. Add --query to cut either down.', 'cl-multi-cost-hunt', 'Cost hunt'],
  ['Start a stopped server', 'Compute', 'aws ec2 start-instances --instance-ids ID', 'az vm start -g GROUP -n NAME', 'AWS names a server by id. Azure names it by group and name, so a right name in the wrong group fails.', 'cl-az-start-staging', 'Start staging'],
  ['Stop to save money', 'Compute', 'aws ec2 stop-instances --instance-ids ID', 'az vm deallocate -g GROUP -n NAME', 'Azure stop keeps billing compute; deallocate releases it. AWS stop ends compute billing but disks keep costing.', 'cl-az-vm-deallocated', 'VM deallocated'],
  ['Delete a server', 'Compute', 'aws ec2 terminate-instances --instance-ids ID', 'az vm delete -g GROUP -n NAME --yes', 'Both are final. AWS can block it with termination protection; Azure with a resource lock.', 'cl-aws-protected-instance', 'Protected instance'],
  ['Open a port', 'Network', 'aws ec2 authorize-security-group-ingress --group-id ID --protocol tcp --port 443 --cidr 10.0.0.0/8', 'az network nsg rule create -g GROUP --nsg-name NSG -n allow-https --priority 200 --access Allow --protocol Tcp --destination-port-ranges 443 --source-address-prefixes 10.0.0.0/8', 'AWS security groups only allow, with no priority. Azure rules have priority numbers and an explicit Allow or Deny.', 'cl-az-nsg-https', 'NSG for HTTPS'],
  ['Find rules open to the world', 'Network', 'aws ec2 describe-security-groups --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==\'0.0.0.0/0\']]].GroupId"', 'az network nsg rule list -g GROUP --nsg-name NSG -o table', 'Look for 0.0.0.0/0 (AWS) or source * / Internet (Azure) on ports like 22, 3389 and database ports.', 'cl-multi-public-audit', 'Public audit'],
  ['Close SSH to the world', 'Network', 'aws ec2 revoke-security-group-ingress --group-id ID --protocol tcp --port 22 --cidr 0.0.0.0/0', 'az network nsg rule delete -g GROUP --nsg-name NSG -n NAME', 'AWS removes a rule by its content; Azure removes it by name. Always list first so you remove the right one.', 'cl-aws-ssh-blocked', 'SSH blocked'],
  ['See who has access', 'Access', 'aws iam list-attached-role-policies --role-name NAME', 'az role assignment list --all -o table', 'AWS attaches policies to a role. Azure assigns a role to a person at a scope. In Azure, always read the scope column.', 'cl-az-role-scope-rg', 'Role scope'],
  ['Remove too much access', 'Access', 'aws iam detach-role-policy --role-name NAME --policy-arn ARN', 'az role assignment delete --assignee WHO --role Owner --scope SCOPE', 'Remove the wide grant, then add the narrow one the job needs. Do it in that order only if nothing breaks in between.', 'cl-aws-detach-admin', 'Detach admin'],
  ['Find leftover items', 'Cost', 'aws ec2 describe-volumes --filters Name=status,Values=available', 'az group list --query "[?tags.purpose==\'temp\'].name" -o tsv', 'AWS leaks cost as unattached disks and idle servers. Azure leaks it as forgotten groups. Tags tell you who owns it.', 'cl-aws-orphan-volumes', 'Orphan volumes'],
  ['Delete a group of things', 'Cost', 'aws s3 rm s3://NAME --recursive', 'az group delete -n GROUP --yes', 'An Azure group delete removes everything inside. Read the group contents and tags first.', 'cl-az-delete-temp-groups', 'Delete temp groups'],
  ['Check tags', 'Cost', 'aws ec2 describe-instances --query "Reservations[].Instances[].Tags"', 'az group show -n GROUP --query tags', 'Tags such as owner and purpose are how you decide what is safe to delete. A missing tag is a finding.', 'cl-aws-missing-tags', 'Missing tags']
];
var GCP = {
  'Who am I': 'gcloud auth list\ngcloud config get-value project',
  'List storage': 'gcloud storage buckets list',
  'Make storage private': 'gcloud storage buckets update gs://NAME --public-access-prevention',
  'Keep old file versions': 'gcloud storage buckets update gs://NAME --versioning',
  'List servers': 'gcloud compute instances list',
  'Start a stopped server': 'gcloud compute instances start NAME --zone ZONE',
  'Stop to save money': 'gcloud compute instances stop NAME --zone ZONE',
  'Delete a server': 'gcloud compute instances delete NAME --zone ZONE --quiet',
  'Open a port': 'gcloud compute firewall-rules create NAME --allow tcp:443 --source-ranges 10.0.0.0/8',
  'Find rules open to the world': 'gcloud compute firewall-rules list --format=json',
  'Close SSH to the world': 'gcloud compute firewall-rules delete NAME --quiet',
  'See who has access': 'gcloud projects get-iam-policy PROJECT',
  'Remove too much access': 'gcloud projects remove-iam-policy-binding PROJECT --member=user:WHO --role=roles/owner',
  'Find leftover items': 'gcloud compute instances list --filter="status=TERMINATED"',
  'Delete a group of things': 'gcloud projects delete PROJECT   (deleting a project removes everything in it)',
  'Check tags': 'gcloud compute instances describe NAME --zone ZONE   (read the labels field)'
};
var GLAB = { 'Who am I': ['cl-gcp-wrong-project', 'Wrong project'], 'Make storage private': ['cl-gcp-public-bucket', 'Public bucket'], 'Open a port': ['cl-gcp-ssh-firewall', 'SSH firewall rule'], 'Remove too much access': ['cl-gcp-remove-owner', 'Remove Owner'] };
var GROUPS = ['Identity', 'Storage', 'Compute', 'Network', 'Access', 'Cost'];
function view() {
  var rows = ROWS.map(function (r, i) {
    return '<article class="cc-row" data-g="' + e(r[1]) + '" aria-labelledby="cc-h' + i + '"><h3 id="cc-h' + i + '">' + e(r[0]) + ' <span class="chip">' + e(r[1]) + '</span></h3>' +
      '<div class="cc-cols"><div class="cc-aws"><h4>AWS</h4><pre class="evidence" tabindex="0"><code>' + e(r[2]) + '</code></pre></div>' +
      '<div class="cc-az"><h4>Azure</h4><pre class="evidence" tabindex="0"><code>' + e(r[3]) + '</code></pre></div>' +
      '<div class="cc-gcp"><h4>Google Cloud</h4><pre class="evidence" tabindex="0"><code>' + e(GCP[r[0]] || 'See the Google Cloud documentation') + '</code></pre></div></div>' +
      '<p class="small"><strong>Difference that bites:</strong> ' + e(r[4]) + '</p>' +
      '<p class="small">Practise it: <a href="#/terminal-lab/' + e(r[5]) + '">' + e(r[6]) + '</a>' + (GLAB[r[0]] ? ' or on Google Cloud: <a href="#/terminal-lab/' + e(GLAB[r[0]][0]) + '">' + e(GLAB[r[0]][1]) + '</a>' : '') + '</p></article>';
  }).join('');
  return { title: 'AWS, Azure and Google Cloud side by side | Cloud compare | MARGA by EknathaLabs', nav: 'practice',
    html: '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a> <a href="#/terminal-labs">Terminal labs</a> <a href="#/terminal-labs/cloud">Cloud</a></nav><h1>AWS, Azure and Google Cloud side by side</h1>' +
      '<p class="lede">The same ' + ROWS.length + ' jobs done in three clouds, with the difference that catches people out and a simulated lab to try it. Commands are the ones the labs accept; replace NAME, GROUP and ID with your own.</p></section>' +
      '<div class="wrap"><div class="cc-bar" role="group" aria-label="Show"><label class="field"><span>Show</span><select id="cc-prov"><option value="both">AWS, Azure and Google Cloud</option><option value="aws">AWS only</option><option value="gcp">Google Cloud only</option><option value="az">Azure only</option></select></label>' +
      '<label class="field"><span>Area</span><select id="cc-grp"><option value="">All areas</option>' + GROUPS.map(function (g) { return '<option>' + e(g) + '</option>'; }).join('') + '</select></label><p class="small" id="cc-count" role="status" aria-live="polite"></p></div>' +
      '<div class="cc-list" id="cc-list">' + rows + '</div></div>',
    after: function () {
      var prov = $('#cc-prov'), grp = $('#cc-grp'), list = $('#cc-list');
      function apply() {
        var n = 0;
        Array.prototype.forEach.call(list.children, function (r) {
          var ok = !grp.value || r.getAttribute('data-g') === grp.value; r.hidden = !ok; if (ok) n++;
          r.querySelector('.cc-aws').hidden = prov.value === 'az' || prov.value === 'gcp'; r.querySelector('.cc-az').hidden = prov.value === 'aws' || prov.value === 'gcp'; r.querySelector('.cc-gcp').hidden = prov.value === 'aws' || prov.value === 'az';
          r.querySelector('.cc-cols').className = 'cc-cols' + (prov.value === 'both' ? '' : ' one');
        });
        $('#cc-count').textContent = n + (n === 1 ? ' job shown' : ' jobs shown');
      }
      prov.addEventListener('change', apply); grp.addEventListener('change', apply); apply();
    } };
}
A.addRoute(/^\/cloud-compare$/, function () { var v = A.view, o = view(); v.title = o.title; v.nav = o.nav; v.html = o.html; v.after = o.after; });
A.afterRoute(function () {
  var h = location.hash;
  if (!/^#\/(terminal-labs\/cloud|terminal-lab\/cl-)/.test(h) || $('#cc-link')) return;
  var head = $('.page-head'); if (!head) return;
  var p = document.createElement('p'); p.id = 'cc-link'; p.className = 'small';
  p.innerHTML = 'Comparing clouds? <a href="#/cloud-compare">See the same jobs in AWS, Azure and Google Cloud side by side.</a>';
  head.appendChild(p);
});
};
