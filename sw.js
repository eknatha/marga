'use strict';
// Network-first service worker: fresh content when online, full offline use from cache otherwise.
const CACHE = 'marga-c2492536';
const FILES = ["./","index.html","assets/app.css","assets/app.js","assets/data.js","assets/i18n/te.js","assets/i18n/hi.js","assets/i18n/ta.js","assets/i18n/kn.js","assets/i18n/ml.js","assets/i18n/bn.js","assets/i18n/es.js","assets/i18n/de.js","assets/i18n/fr.js","assets/i18n/pt.js","assets/i18n/mr.js","assets/i18n/id.js","assets/i18n/gu.js","assets/i18n/ru.js","assets/lessons/linux.js","assets/lessons/git.js","assets/lessons/bash.js","assets/lessons/python.js","assets/lessons/networking.js","assets/lessons/docker.js","assets/lessons/cicd.js","assets/lessons/kubernetes.js","assets/lessons/terraform.js","assets/lessons/cloud.js","assets/lessons/observability.js","assets/lessons/sre.js","assets/lessons/security.js","assets/lessons/ansible.js","assets/lessons/databases.js","assets/lessons/go.js","assets/lessons/helm.js","assets/lessons/cloud-iam.js","assets/lessons/k8s-ops.js","assets/lessons/argocd.js","assets/lessons/llm.js","assets/lessons/prompting.js","assets/lessons/claude-skills.js","assets/lessons/mcp.js","assets/lessons/system-design.js","assets/lessons/mlops.js","assets/lessons/aiops.js","assets/lessons/virtualization.js","assets/lessons/storage.js","assets/lessons/kubevirt.js","assets/lessons/ceph.js","assets/lessons/vault.js","assets/lessons/sql-ops.js","assets/lessons/gpu-serving.js","assets/lessons/openstack.js","assets/lessons/baremetal.js","assets/lessons/service-mesh.js","assets/lessons/proxies.js","assets/lessons/messaging.js","assets/lessons/cfn-bicep.js","assets/lessons/gcp.js","assets/i18n.js","assets/voice.js","assets/counter.js","assets/calc.js","assets/a11y.js","assets/extras.js","assets/net.js","assets/search.js","assets/yaml.js","assets/explainers.js","assets/lab.js","assets/more.js","assets/placement.js","assets/tracks.js","assets/broken.js","assets/labs-ui.js","assets/termlabs-ui.js","assets/features.js","assets/badges.js","assets/choose.js","assets/skilllab.js","assets/casefile.js","assets/sdlab.js","assets/widgets.js","assets/diagrams.js","assets/plans.js","assets/replay.js","assets/portfolio.js","assets/guided.js","assets/handbook.js","assets/share.js","assets/vmlinux.js","assets/challenge-core.js","assets/challenge.js","assets/workshop.js","assets/interviewlab.js","assets/roadmap.js","assets/searchpage.js","assets/guide.js","assets/explain-out.js","assets/designs.js","assets/crosslinks.js","assets/cloudcompare.js","assets/learn.js","assets/tour.js","assets/motion.js","assets/studio.js","assets/term-fs.js","assets/term-parse.js","assets/term-exec.js","assets/term-cmds.js","assets/term-text.js","assets/term-awk.js","assets/term-jq.js","assets/term-sys.js","assets/term-net.js","assets/term-k8s.js","assets/term-docker.js","assets/term-cloud.js","assets/term-iac.js","assets/term-helm.js","assets/term-infra.js","assets/term-hw.js","assets/term-labs.js","icon.svg","manifest.webmanifest","cheatsheets/","assets/fonts/bricolage-grotesque.woff2","assets/fonts/source-serif-4.woff2","assets/fonts/source-serif-4-italic.woff2","assets/fonts/jetbrains-mono.woff2","cheatsheets/aiops.html","cheatsheets/ansible.html","cheatsheets/argocd.html","cheatsheets/aws.html","cheatsheets/azure.html","cheatsheets/baremetal.html","cheatsheets/bash.html","cheatsheets/ceph.html","cheatsheets/cfn-bicep.html","cheatsheets/cicd.html","cheatsheets/claude-skills.html","cheatsheets/cloud-iam.html","cheatsheets/databases.html","cheatsheets/docker.html","cheatsheets/gcp.html","cheatsheets/git.html","cheatsheets/go.html","cheatsheets/gpu-serving.html","cheatsheets/helm-beginners.html","cheatsheets/helm.html","cheatsheets/k8s-ops.html","cheatsheets/kubernetes.html","cheatsheets/kubevirt.html","cheatsheets/linux.html","cheatsheets/llm.html","cheatsheets/mcp.html","cheatsheets/messaging.html","cheatsheets/mlops.html","cheatsheets/networking.html","cheatsheets/openstack.html","cheatsheets/prometheus.html","cheatsheets/prompting.html","cheatsheets/proxies.html","cheatsheets/python.html","cheatsheets/security.html","cheatsheets/service-mesh.html","cheatsheets/sql-ops.html","cheatsheets/sre.html","cheatsheets/storage.html","cheatsheets/system-design.html","cheatsheets/systemd.html","cheatsheets/terraform.html","cheatsheets/vault.html","cheatsheets/virtualization.html"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
