## The canary subset does not exist
id: sm-subset-missing
module: service-mesh
level: Intermediate
minutes: 12
lesson: service-mesh/mtls-and-traffic-management
engine: Simulated istioctl
summary: A VirtualService routes ten percent of traffic to v2, but 503 errors appear. Find the missing subset and add it.
@@ story
You applied a canary rule for the reviews service. Ten percent of calls return 503. The configuration is in the mesh folder. Use istioctl analyze to see what is wrong, then fix the DestinationRule.
@@ goals
- Run istioctl analyze on the mesh folder and read the error.
- Add the v2 subset, labelled version: v2, to the DestinationRule.
- Run analyze again and see no errors.
@@ hints
- `istioctl analyze /home/user/mesh` reads every YAML file in the folder.
- The error mentions the host and subset that were not found, reviews+v2.
- Append to the end of dr.yaml: `printf "  - name: v2\n    labels:\n      version: v2\n" >> /home/user/mesh/dr.yaml`.
@@ world
{"cwd": "/home/user", "more": {"mesh": {"proxies": [{"name": "reviews-v1-7c.shop"}]}}}
@@ file /home/user/mesh/vs.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: shop
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 90
    - destination:
        host: reviews
        subset: v2
      weight: 10

@@ file /home/user/mesh/dr.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: shop
spec:
  host: reviews
  subsets:
  - name: v1
    labels:
      version: v1

@@ file /home/user/mesh/svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: reviews
  namespace: shop
spec:
  selector:
    app: reviews
  ports:
  - name: http-reviews
    port: 9080
    targetPort: 9080

@@ file /home/user/mesh/ns.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shop
  labels:
    istio-injection: enabled

@@ checks
[
 {
  "t": "cmd",
  "run": "istioctl analyze /home/user/mesh",
  "code": 0,
  "label": "no IST0101 errors remain",
  "notOut": "IST0101"
 },
 {
  "t": "contains",
  "path": "/home/user/mesh/dr.yaml",
  "label": "the DestinationRule defines v2",
  "re": "name:\\s*v2"
 },
 {
  "t": "contains",
  "path": "/home/user/mesh/dr.yaml",
  "label": "v2 pods are selected by label",
  "re": "version:\\s*v2"
 }
]
@@ explain
A VirtualService can name a subset, but the subset is defined in a DestinationRule by pod labels. Without it the proxy has no endpoints for v2 and answers 503. Run analyze before you watch dashboards.
@@ solution
istioctl analyze /home/user/mesh
cat /home/user/mesh/dr.yaml
printf "  - name: v2\n    labels:\n      version: v2\n" >> /home/user/mesh/dr.yaml
istioctl analyze /home/user/mesh


## Weights that do not add up
id: sm-weights-total
module: service-mesh
level: Beginner
minutes: 10
lesson: service-mesh/mtls-and-traffic-management
engine: Simulated istioctl
summary: A canary rule is rejected because its weights add up to 110. Correct them to 90 and 10.
@@ story
The reviews VirtualService sends 90 percent to v1 and 20 percent to v2, so the weights total 110. Istio rejects that. Keep the canary small: 90 to v1 and 10 to v2.
@@ goals
- Run istioctl analyze and read the weight error.
- Change the v2 weight to 10.
- Run analyze again with no errors.
@@ hints
- `istioctl analyze /home/user/mesh` prints the total destination weight.
- The v2 weight is the second `weight:` line in vs.yaml.
- `sed -i "s/weight: 20/weight: 10/" /home/user/mesh/vs.yaml`.
@@ world
{"cwd": "/home/user", "more": {"mesh": {"proxies": []}}}
@@ file /home/user/mesh/vs.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: shop
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 90
    - destination:
        host: reviews
        subset: v2
      weight: 20

@@ file /home/user/mesh/dr.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: shop
spec:
  host: reviews
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2

@@ file /home/user/mesh/svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: reviews
  namespace: shop
spec:
  selector:
    app: reviews
  ports:
  - name: http-reviews
    port: 9080
    targetPort: 9080

@@ file /home/user/mesh/ns.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shop
  labels:
    istio-injection: enabled

@@ checks
[
 {
  "t": "cmd",
  "run": "istioctl analyze /home/user/mesh",
  "code": 0,
  "label": "analyze reports no error",
  "notOut": "Error"
 },
 {
  "t": "contains",
  "path": "/home/user/mesh/vs.yaml",
  "label": "v1 keeps weight 90",
  "re": "weight:\\s*90"
 },
 {
  "t": "contains",
  "path": "/home/user/mesh/vs.yaml",
  "label": "v2 has weight 10",
  "re": "weight:\\s*10"
 }
]
@@ explain
Weights inside one route must add up to 100. Start a canary small, so a mistake only affects a few users, and let tools check the rule before it reaches production.
@@ solution
istioctl analyze /home/user/mesh
grep -n weight /home/user/mesh/vs.yaml
sed -i "s/weight: 20/weight: 10/" /home/user/mesh/vs.yaml
istioctl analyze /home/user/mesh


## The namespace has no sidecars
id: sm-namespace-injection
module: service-mesh
level: Beginner
minutes: 10
lesson: service-mesh/what-a-service-mesh-is-and-how-it-works
engine: Simulated istioctl
summary: Pods in the shop namespace run without sidecars. Label the namespace for injection in its manifest.
@@ story
The shop pods show 1/1 ready, so they have no proxy and no mTLS. The namespace manifest lacks the injection label. Fix the manifest and confirm with analyze.
@@ goals
- Run istioctl analyze and read the namespace message.
- Add the istio-injection: enabled label to the Namespace manifest.
- Run analyze again with no messages.
@@ hints
- `istioctl analyze /home/user/mesh` prints an IST0102 message for the namespace.
- Labels go under metadata, next to name.
- `printf "  labels:\n    istio-injection: enabled\n" >> /home/user/mesh/ns.yaml` appends the label block.
@@ world
{"cwd": "/home/user", "more": {"mesh": {"proxies": []}}}
@@ file /home/user/mesh/ns.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shop

@@ file /home/user/mesh/svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: reviews
  namespace: shop
spec:
  selector:
    app: reviews
  ports:
  - name: http-reviews
    port: 9080
    targetPort: 9080

@@ checks
[
 {
  "t": "cmd",
  "run": "istioctl analyze /home/user/mesh",
  "code": 0,
  "label": "no injection message remains",
  "notOut": "IST0102"
 },
 {
  "t": "contains",
  "path": "/home/user/mesh/ns.yaml",
  "label": "the namespace is labelled for injection",
  "re": "istio-injection:\\s*enabled"
 }
]
@@ explain
Injection is chosen by a label on the namespace. The label only affects pods created after it is set, so restart the workloads afterwards and check that every pod reads 2/2.
@@ solution
istioctl analyze /home/user/mesh
cat /home/user/mesh/ns.yaml
printf "  labels:\n    istio-injection: enabled\n" >> /home/user/mesh/ns.yaml
istioctl analyze /home/user/mesh


## The port name hides the protocol
id: sm-port-name
module: service-mesh
level: Intermediate
minutes: 10
lesson: service-mesh/observing-and-troubleshooting-the-mesh
engine: Simulated istioctl
summary: HTTP routing rules are ignored for the web Service. Name its port so the mesh knows it is HTTP.
@@ story
Retries and routing set for web have no effect. istioctl analyze says the port name does not follow the Istio naming convention, so the mesh treats the traffic as plain TCP. Name the port http-web.
@@ goals
- Run istioctl analyze and read the port message.
- Give the Service port the name http-web.
- Run analyze again with no messages.
@@ hints
- `istioctl analyze /home/user/mesh` reports IST0118 for the Service.
- The name goes before the port number in the ports list.
- `sed -i "s/^  - port: 80/  - name: http-web\n    port: 80/" /home/user/mesh/svc.yaml`.
@@ world
{"cwd": "/home/user", "more": {"mesh": {"proxies": []}}}
@@ file /home/user/mesh/svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080

@@ file /home/user/mesh/ns.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shop
  labels:
    istio-injection: enabled

@@ checks
[
 {
  "t": "cmd",
  "run": "istioctl analyze /home/user/mesh",
  "code": 0,
  "label": "no port naming message remains",
  "notOut": "IST0118"
 },
 {
  "t": "contains",
  "path": "/home/user/mesh/svc.yaml",
  "label": "the port is named with the http prefix",
  "re": "name:\\s*http-web"
 }
]
@@ explain
The mesh decides how to treat traffic from the port name or the appProtocol field. A name without a protocol prefix makes it plain TCP, so HTTP features such as retries and path routing quietly do not apply.
@@ solution
istioctl analyze /home/user/mesh
cat /home/user/mesh/svc.yaml
sed -i "s/^  - port: 80/  - name: http-web\n    port: 80/" /home/user/mesh/svc.yaml
istioctl analyze /home/user/mesh


## The route points at a host that does not exist
id: sm-host-typo
module: service-mesh
level: Intermediate
minutes: 10
lesson: service-mesh/mtls-and-traffic-management
engine: Simulated istioctl
summary: A VirtualService sends traffic to a misspelled host. Correct the host name.
@@ story
Calls to the reviews service return 503 with response flag NR or UH. The VirtualService sends traffic to reviewz, but the Service is called reviews. Fix the typo.
@@ goals
- Run istioctl analyze and find the host that is not found.
- Correct the destination host to reviews.
- Run analyze again with no errors.
@@ hints
- `istioctl analyze /home/user/mesh` prints "Referenced host not found".
- The destination host is in vs.yaml.
- `sed -i "s/host: reviewz/host: reviews/" /home/user/mesh/vs.yaml`.
@@ world
{"cwd": "/home/user", "more": {"mesh": {"proxies": []}}}
@@ file /home/user/mesh/vs.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: shop
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviewz
        port:
          number: 9080
      weight: 100

@@ file /home/user/mesh/svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: reviews
  namespace: shop
spec:
  selector:
    app: reviews
  ports:
  - name: http-reviews
    port: 9080
    targetPort: 9080

@@ file /home/user/mesh/ns.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shop
  labels:
    istio-injection: enabled

@@ checks
[
 {
  "t": "cmd",
  "run": "istioctl analyze /home/user/mesh",
  "code": 0,
  "label": "analyze reports no error",
  "notOut": "Error"
 },
 {
  "t": "contains",
  "path": "/home/user/mesh/vs.yaml",
  "label": "the typo is gone",
  "re": "reviewz",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/mesh/vs.yaml",
  "label": "the route uses reviews",
  "re": "host:\\s*reviews\\s"
 }
]
@@ explain
A route to a host that no Service matches has no endpoints, so requests fail. Static checks catch spelling mistakes before users do, so run analyze in the pipeline.
@@ solution
istioctl analyze /home/user/mesh
grep -n host /home/user/mesh/vs.yaml
sed -i "s/host: reviewz/host: reviews/" /home/user/mesh/vs.yaml
istioctl analyze /home/user/mesh

