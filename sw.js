'use strict';
// Network-first service worker: fresh content when online, full offline use from cache otherwise.
const CACHE = 'marga-ad2df03b';
const FILES = ["./","index.html","assets/app.css","assets/app.js","assets/data.js","assets/voice.js","assets/counter.js","assets/calc.js","assets/a11y.js","assets/extras.js","assets/net.js","assets/search.js","assets/yaml.js","assets/explainers.js","assets/lab.js","assets/more.js","assets/labs-ui.js","assets/termlabs-ui.js","assets/features.js","assets/badges.js","assets/choose.js","assets/skilllab.js","assets/casefile.js","assets/sdlab.js","assets/widgets.js","assets/term-fs.js","assets/term-parse.js","assets/term-exec.js","assets/term-cmds.js","assets/term-text.js","assets/term-awk.js","assets/term-jq.js","assets/term-sys.js","assets/term-net.js","assets/term-labs.js","icon.svg","manifest.webmanifest","cheatsheets/","assets/fonts/bricolage-grotesque.woff2","assets/fonts/source-serif-4.woff2","assets/fonts/source-serif-4-italic.woff2","assets/fonts/jetbrains-mono.woff2","cheatsheets/ansible.html","cheatsheets/argocd.html","cheatsheets/aws.html","cheatsheets/azure.html","cheatsheets/bash.html","cheatsheets/cicd.html","cheatsheets/claude-skills.html","cheatsheets/cloud-iam.html","cheatsheets/databases.html","cheatsheets/docker.html","cheatsheets/git.html","cheatsheets/go.html","cheatsheets/helm-beginners.html","cheatsheets/helm.html","cheatsheets/k8s-ops.html","cheatsheets/kubernetes.html","cheatsheets/linux.html","cheatsheets/llm.html","cheatsheets/mcp.html","cheatsheets/networking.html","cheatsheets/prometheus.html","cheatsheets/prompting.html","cheatsheets/python.html","cheatsheets/security.html","cheatsheets/sre.html","cheatsheets/system-design.html","cheatsheets/systemd.html","cheatsheets/terraform.html"];

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
