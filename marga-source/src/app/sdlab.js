/* MARGA System Design Lab: estimator, break-it simulator on six fixed designs, and case-file challenges.
   Everything runs in the browser. The simulator is a labelled model with stated assumptions, not a measurement.
   Registered by app.js through the small API. Pure functions are exposed as window.MargaSD for tests. */
window.MargaSDLab = function (A) {
'use strict';
var D = A.D, view = A.view, $ = A.$, $$ = A.$$, e = A.e;
function fmt(n) { return Number(n).toLocaleString('en-US'); }
function r1(n) { return Math.round(n * 10) / 10; }

/* ---------------------------------------------------------------- estimator */
function estimate(i) {
  var users = +i.users, perUser = +i.perUser, readPct = Math.min(100, Math.max(0, +i.readPct)), kb = +i.respKb, wkb = +i.writeKb,
      peak = +i.peak, copies = +i.copies, cap = +i.cap, slo = +i.slo;
  var vals = [users, perUser, kb, wkb, peak, copies, cap, slo];
  for (var k = 0; k < vals.length; k++) if (!isFinite(vals[k]) || vals[k] < 0) return { error: 'Use numbers of zero or more in every field.' };
  if (!(users > 0 && perUser > 0 && peak >= 1 && cap > 0 && copies >= 1)) return { error: 'Users, requests, peak factor, copies and capacity must be above zero.' };
  var perDay = users * perUser, avg = perDay / 86400, pk = avg * peak, writes = pk * (100 - readPct) / 100;
  var egressMbit = pk * kb * 8 / 1000, perYearTb = users * wkb * 365 * copies / 1e9;
  var inst = Math.ceil(pk / (cap * 0.6)), instN1 = inst + 1;
  var budget = 43200 * (1 - slo / 100);
  var notes = [];
  if (writes > 10000) notes.push('Peak writes are about ' + fmt(Math.round(writes)) + ' per second. One database node usually cannot take this; plan a queue, batching or sharding.');
  else notes.push('Peak writes are about ' + fmt(Math.round(writes)) + ' per second, which one well-sized primary can usually take. Say so, and say at what growth you would shard.');
  if (pk > cap * 0.6) notes.push('Peak is above one instance at 60 percent load, so you need a load balancer and at least ' + instN1 + ' instances including one spare.');
  if (perYearTb > 20) notes.push('Storage grows by about ' + r1(perYearTb) + ' TB a year with copies; one node will not hold it for long. Plan partitioning and retention.');
  if (slo >= 99.99) notes.push('A budget of ' + r1(budget) + ' minutes a month leaves no time for a human to react. It needs automatic failover and staged rollout.');
  else if (slo >= 99.9) notes.push('A budget of ' + r1(budget) + ' minutes a month allows one short incident. Practise failover and keep rollouts staged.');
  return { perDay: perDay, avg: avg, peak: pk, writes: writes, egressMbit: egressMbit, perYearTb: perYearTb, instances: inst, withSpare: instN1, budget: budget, notes: notes };
}

/* ---------------------------------------------------------------- simulator data
   Each fault: a = percent of users affected, m = minutes until recovery, for the design as drawn (base) and with the fix applied (fa, fm).
   Cost in full-outage minutes = a / 100 * m. The numbers are teaching assumptions, stated on screen. */
var DESIGNS = [
{ id: 'single-region', title: 'API in one region', fixLabel: 'Split into cells with a thin router', fixNote: 'Eight independent cells, each with its own app, cache and database. A router sends each customer to one cell, and rollouts go cell by cell.',
  lesson: 'system-design/failure-domains-cells-and-bulkheads', case: 'aws-s3-outage-in-us-east-1',
  comps: [['dns', 'DNS provider', 0, 0], ['lb', 'Load balancer or router', 1, 0], ['app', 'App servers', 2, 0], ['cache', 'Cache', 3, 0], ['db', 'Database', 4, 0]],
  edges: [['dns', 'lb'], ['lb', 'app'], ['app', 'cache'], ['app', 'db']],
  faults: {
    dns: ['The single DNS provider has an outage', 100, 60, 100, 60, 'Everything resolves through one provider.', 'Cells do not help here. DNS is a shared dependency, so it needs a second provider.'],
    lb: ['The load balancer misroutes after a change', 100, 15, 100, 6, 'All traffic passes through one balancer.', 'The router is the shared part of a cell design, so it stays thin and is the most carefully changed part.'],
    app: ['A bad release reaches every server', 100, 25, 12.5, 25, 'One fleet, one release, so a bad build reaches everyone.', 'The canary cell is hit first and the rollout halts, so about one eighth of users see it.'],
    cache: ['The cache restarts and the database is overwhelmed', 100, 15, 12.5, 8, 'A cold cache sends full load to one database.', 'Only one cell has a cold cache, and its database carries one eighth of the load.'],
    db: ['The database primary fails and failover was never drilled', 100, 30, 12.5, 10, 'One primary serves every customer, and a manual promotion takes time.', 'A failure reaches one cell, and automatic promotion is exercised regularly.']
  } },
{ id: 'two-regions', title: 'Two regions, one live and one standby', fixLabel: 'Run active-active with headroom and drills', fixNote: 'Both regions serve users. Each can carry the lost share, health-checked steering shifts traffic automatically, and failover is drilled every quarter.',
  lesson: 'system-design/multi-region-and-global-traffic', case: 'aws-dynamodb-dns-race-condition',
  comps: [['steer', 'Traffic steering (DNS)', 0, 0], ['ra', 'Region A', 1, 0], ['rb', 'Region B', 1, 1], ['repl', 'Replication', 2, 0], ['idp', 'Identity service (global)', 3, 0]],
  edges: [['steer', 'ra'], ['steer', 'rb'], ['ra', 'repl'], ['repl', 'rb'], ['ra', 'idp']],
  faults: {
    steer: ['DNS caches keep users pinned to a dead region', 100, 60, 50, 5, 'A long TTL means clients keep going to region A for up to an hour.', 'Short TTLs, health checks and anycast move traffic in minutes, though some resolvers still lag.'],
    ra: ['Region A is lost', 100, 45, 50, 3, 'Failover is manual and the standby has never carried full load.', 'Half of users are in region A and shift automatically within minutes.'],
    rb: ['The standby is too small when promoted', 100, 60, 10, 5, 'The standby runs at 20 percent capacity and is overloaded at once.', 'Region B already serves traffic at a size that can absorb region A.'],
    repl: ['Replication is 10 minutes behind at failover', 100, 30, 20, 10, 'Recent writes are lost or must be reconciled by hand.', 'Home-region writes and synchronous copies inside a region limit the loss to a small group of customers.'],
    idp: ['The global identity service fails', 100, 30, 100, 30, 'Every region depends on one identity service.', 'Two regions do not remove a shared global dependency. It needs its own redundancy and cached tokens.']
  } },
{ id: 'config-push', title: 'Configuration pushed to a proxy fleet', fixLabel: 'Validate, stage and fail static', fixNote: 'A size and shape check runs before publish, rollout goes to one cell first with a bake time, proxies keep the last good file on bad input, and a kill switch exists.',
  lesson: 'system-design/config-and-control-plane-change-safety', case: 'cloudflare-bot-management-feature-file',
  comps: [['gen', 'Config generator', 0, 0], ['cp', 'Control plane push', 1, 0], ['fleet', 'Proxy fleet', 2, 0], ['kill', 'Kill switch and rollback', 3, 0], ['mon', 'Monitoring', 2, 1]],
  edges: [['gen', 'cp'], ['cp', 'fleet'], ['kill', 'cp'], ['fleet', 'mon']],
  faults: {
    gen: ['The generated file doubles in size', 100, 180, 5, 15, 'Nothing checks the file before it ships.', 'A size and shape check rejects it, or a canary cell sees it first.'],
    cp: ['A bad value replicates everywhere in seconds', 100, 120, 5, 10, 'There is no staging, so everyone gets it at once.', 'The push goes to one cell, waits, and halts on errors.'],
    fleet: ['Proxies crash on the bad input', 100, 150, 5, 5, 'The loader aborts instead of keeping the previous file.', 'Proxies keep the last known good file and raise an alert.'],
    kill: ['No fast way to roll back', 100, 90, 100, 10, 'Rollback needs a rebuild and a full push.', 'A kill switch disables the feature globally in minutes.'],
    mon: ['Monitoring runs on the failing fleet', 100, 60, 20, 10, 'Engineers lose their view while diagnosing.', 'An independent, simple monitoring path still shows the core signals.']
  } },
{ id: 'status-page', title: 'Status page and incident communication', fixLabel: 'Host the page and alerts independently', fixNote: 'The status page lives on another provider with its own DNS zone, separate publisher accounts, a manual upload path and an independent alert channel.',
  lesson: 'system-design/worked-design-the-status-page-that-survives', case: 'aws-s3-outage-in-us-east-1',
  comps: [['product', 'Product stack', 0, 0], ['page', 'Status page', 1, 0], ['dns', 'DNS zone', 2, 0], ['sso', 'Staff SSO and publishing', 3, 0], ['notify', 'Email and chat alerts', 4, 0]],
  edges: [['product', 'page'], ['page', 'dns'], ['sso', 'page'], ['page', 'notify']],
  faults: {
    product: ['The product has an outage (the event the page exists for)', 100, 60, 100, 60, 'The product is down for everyone.', 'Independent hosting does not prevent the outage. It lets you talk about it.'],
    page: ['The page is hosted on the failing stack', 100, 60, 0, 0, 'Customers cannot read the page when they need it.', 'The page is static, on another provider, and keeps working.'],
    dns: ['The shared DNS zone fails', 100, 45, 0, 0, 'The status name stops resolving with the product name.', 'The status domain uses another registrar and DNS provider.'],
    sso: ['SSO is down, so staff cannot publish', 100, 40, 0, 0, 'Nobody can post an update.', 'Publishers have separate accounts and a documented manual upload path.'],
    notify: ['The alert provider has its own outage', 100, 30, 30, 10, 'Subscribers get nothing.', 'A second channel reaches most subscribers.']
  } },
{ id: 'retry-chain', title: 'Service chain with retries', fixLabel: 'Retry budget, breaker and degradation', fixNote: 'Retries happen at one layer with jittered backoff and a budget, a circuit breaker opens on a slow dependency, and optional features fall back.',
  lesson: 'system-design/queues-retries-and-idempotency', case: 'aws-kinesis-outage',
  comps: [['client', 'Clients', 0, 0], ['gw', 'Gateway', 1, 0], ['svc', 'Service', 2, 0], ['dep', 'Dependency', 3, 0], ['cache', 'Cache', 3, 1]],
  edges: [['client', 'gw'], ['gw', 'svc'], ['svc', 'dep'], ['svc', 'cache']],
  faults: {
    client: ['Clients retry at once with no jitter', 100, 25, 10, 5, 'Retries arrive in waves.', 'Jitter and backoff spread the retries out.'],
    gw: ['The gateway retries failed calls', 100, 20, 10, 5, 'Each layer adds its own retries.', 'Only one layer retries, within a budget.'],
    svc: ['The service thread pool is exhausted', 100, 30, 20, 5, 'Slow calls hold every thread.', 'Timeouts, a breaker and a bulkhead keep threads free.'],
    dep: ['The dependency slows down', 100, 45, 30, 8, 'Three layers of retries keep it saturated long after the cause ends.', 'The breaker opens, load drops, and the dependency recovers.'],
    cache: ['The cache is cold after a restart', 100, 15, 15, 5, 'Misses go straight to the dependency.', 'Requests are coalesced and traffic ramps in steps.']
  } },
{ id: 'queue-pipeline', title: 'Queue and consumer pipeline', fixLabel: 'Bound the queue and add backpressure', fixNote: 'The queue is bounded, producers get backpressure, a dead-letter queue catches poison messages and someone watches it, and consumers are idempotent.',
  lesson: 'system-design/queues-retries-and-idempotency', case: 'honeycomb-kafka-metadata-growth',
  comps: [['prod', 'Producers', 0, 0], ['queue', 'Queue', 1, 0], ['cons', 'Consumers', 2, 0], ['dlq', 'Dead-letter queue', 2, 1], ['down', 'Downstream database', 3, 0]],
  edges: [['prod', 'queue'], ['queue', 'cons'], ['cons', 'dlq'], ['cons', 'down']],
  faults: {
    prod: ['A producer burst', 100, 30, 10, 5, 'Producers are never slowed down.', 'Backpressure and limits slow them and protect the queue.'],
    queue: ['The unbounded queue grows for hours', 100, 120, 20, 10, 'Latency climbs until everything times out.', 'A bound and queue-age alerts catch it early.'],
    cons: ['One poison message blocks a consumer', 100, 90, 2, 5, 'The same message fails and retries forever.', 'It moves to the dead-letter queue after a few attempts.'],
    dlq: ['Failed messages pile up unwatched', 5, 600, 1, 30, 'Nobody looks at the dead-letter queue.', 'An alert and an owner review it daily.'],
    down: ['The downstream database slows down', 100, 60, 40, 15, 'Consumers pile on more work.', 'Consumers slow down and shed optional work.']
  } }
];

function slotCost(f, fixed) { var a = fixed ? f[3] : f[1], m = fixed ? f[4] : f[2]; return { a: a, m: m, cost: a / 100 * m }; }
function simulate(design, compId, fixed, slo) {
  var f = design.faults[compId]; if (!f) return null;
  var c = slotCost(f, fixed), budget = 43200 * (1 - slo / 100);
  return { label: f[0], affected: c.a, minutes: c.m, cost: c.cost, budget: budget, pct: budget ? c.cost / budget * 100 : 0, why: fixed ? f[6] : f[5] };
}

/* ---------------------------------------------------------------- challenges (from case files) */
var CHALLENGES = [
{ id: 'cloudflare-bot-management-feature-file', ask: 'A database permissions change makes a query return duplicate rows. The feature file it generates doubles in size, passes a hard limit in the core proxy and crashes every machine that loads it. Which single design change bounds this best?',
  opts: [['Check the file before it ships, stage the rollout, and keep the last good file on a bad load', 1, 'Guards on the producer and the consumer, plus staging, bound the damage.'], ['Add more proxy servers in each region', 0, 'More servers load the same bad file and crash too.'], ['Make the file update every minute instead of every five', 0, 'A faster push delivers bad data sooner.'], ['Move the proxies to a bigger instance type', 0, 'The cause is bad input, not capacity.']], lesson: 'system-design/config-and-control-plane-change-safety' },
{ id: 'google-cloud-service-control-null-pointer', ask: 'A policy change with blank fields reaches a new, unprotected feature in a core service. A null pointer sends binaries into a crash loop in every region within minutes. What would have limited it most?',
  opts: [['Roll out the feature behind a flag and stage policy changes region by region', 1, 'A flag and staging limit the share of regions that see a bad value.'], ['Add a second copy of the policy database', 0, 'Replication spreads the bad data faster.'], ['Raise the number of retries', 0, 'Retries do not fix a crash on input.'], ['Add an alert for 503 errors', 0, 'It helps detection, not blast radius.']], lesson: 'system-design/blast-radius-and-shuffle-sharding' },
{ id: 'facebook-bgp-outage', ask: 'A change on the internal backbone withdraws the routes to the DNS servers. The name stops resolving and the tools needed to repair it share the same network. What is the strongest design response?',
  opts: [['Pre-check that a change keeps access, and keep out-of-band access and tools off the same network', 1, 'You must be able to fix the thing without the thing.'], ['Shorten every DNS TTL to 30 seconds', 0, 'TTLs do not help when the servers are unreachable.'], ['Add a third data centre', 0, 'The backbone change reaches all of them.'], ['Cache DNS answers longer in browsers', 0, 'Cached answers expire and do not repair the cause.']], lesson: 'system-design/hidden-dependencies-and-single-points' },
{ id: 'aws-s3-outage-in-us-east-1', ask: 'A debugging command removes far more capacity than intended, and two subsystems need a full restart that nobody practised at that scale. What design changes help most?',
  opts: [['Limit how fast a tool can remove capacity, enforce a minimum, and practise full restarts', 1, 'Guardrails bound the mistake and rehearsal shortens recovery.'], ['Require two engineers to approve every command', 0, 'Approval helps but does not bound a wrong target or speed up restart.'], ['Rewrite the tool in a safer language', 0, 'The problem is missing limits, not language.'], ['Buy a faster network', 0, 'Restart time came from design, not bandwidth.']], lesson: 'system-design/worked-design-the-status-page-that-survives' },
{ id: 'gocardless-postgres-failover', ask: 'A database primary loses its disk array. A synchronous replica is healthy but the cluster manager does not promote it, and engineers promote it by hand after almost two hours. What should the design include?',
  opts: [['Failover that is exercised on a schedule, with alerts when it does not trigger', 1, 'A failover you never test is a hope, not a feature.'], ['A third replica in the same rack', 0, 'The replica was healthy; promotion was the problem.'], ['A longer failover timeout', 0, 'That slows recovery further.'], ['Asynchronous replication only', 0, 'It does not fix promotion and risks losing data.']], lesson: 'system-design/consistency-and-availability-in-practice' },
{ id: 'google-cloud-authentication-quota-outage', ask: 'An automated quota system cuts the quota of a core identity service to zero because an old system reported its usage as zero. Almost everything fails for about 50 minutes. What design rule applies?',
  opts: [['Automated limits need sanity checks, a floor and staged application', 1, 'A limit is a dependency that can fail like any other.'], ['Remove quotas from core services', 0, 'Quotas protect services from overload.'], ['Add retries to authentication', 0, 'Retries cannot succeed when the quota is zero.'], ['Cache passwords for longer', 0, 'It is unsafe and does not address the cause.']], lesson: 'system-design/rate-limiting-and-load-shedding' },
{ id: 'cloudflare-workers-kv-third-party-dependency', ask: 'A third-party storage provider that backs part of a key-value service has an outage, and many products that depended on that service fail with it. What should the design have?',
  opts: [['A dependency map, a fallback or independent path for each critical vendor, and tested static stability', 1, 'You inherit a vendor outage unless you plan for it.'], ['More servers in front of the service', 0, 'The failure is behind them.'], ['A longer TTL on every record', 0, 'It does not remove the dependency.'], ['A bigger rate limit', 0, 'Not an overload problem.']], lesson: 'system-design/hidden-dependencies-and-single-points' },
{ id: 'datadog-multi-region-outage', ask: 'A systemd security update applied automatically to virtual machines in several regions at once. A restart deleted network routes and took tens of thousands of nodes offline. What would have bounded it?',
  opts: [['Stage OS updates by region and canary group, with a halt on failure', 1, 'The update was a shared change across failure domains.'], ['Add more regions', 0, 'The same update would reach them too.'], ['Add more nodes per region', 0, 'More nodes get the same update.'], ['Increase monitoring retention', 0, 'It does not limit the blast radius.']], lesson: 'system-design/failure-domains-cells-and-bulkheads' }
];

/* ---------------------------------------------------------------- views */
function bag() { var s = A.state(); if (!s.sdl || typeof s.sdl !== 'object' || Array.isArray(s.sdl)) s.sdl = {}; return s.sdl; }
function field(id, label, val, min, step) { return '<label class="field calc-f"><span>' + e(label) + '</span><input id="' + id + '" type="number" min="' + (min || 0) + '" step="' + (step || 'any') + '" value="' + val + '" inputmode="decimal"></label>'; }
function row(k, v) { return '<div class="calc-row"><dt>' + e(k) + '</dt><dd>' + e(v) + '</dd></div>'; }

function diagram(d, fixed, sel) {
  var NW = 150, NH = 46, CW = 190, RH = 80, P = 16, maxC = 0, maxR = 0, by = {};
  d.comps.forEach(function (c) { by[c[0]] = c; if (c[2] > maxC) maxC = c[2]; if (c[3] > maxR) maxR = c[3]; });
  var W = P * 2 + maxC * CW + NW, H = P * 2 + maxR * RH + NH;
  function cx(c) { return P + c[2] * CW + NW / 2; } function cy(c) { return P + c[3] * RH + NH / 2; }
  var s = '<svg class="sdd" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="group" aria-label="Design diagram. Choose a component to fail it.">';
  d.edges.forEach(function (ed) { var a = by[ed[0]], b = by[ed[1]]; s += '<line x1="' + cx(a) + '" y1="' + cy(a) + '" x2="' + cx(b) + '" y2="' + cy(b) + '" class="sdl"/>'; });
  d.comps.forEach(function (c) {
    var f = d.faults[c[0]], cost = slotCost(f, fixed), hot = cost.a >= 100 ? ' hot' : '';
    s += '<g class="sdn' + hot + (sel === c[0] ? ' on' : '') + '" role="button" tabindex="0" data-comp="' + e(c[0]) + '" aria-pressed="' + (sel === c[0]) + '" aria-label="' + e(c[1]) + '. Fail this component."><rect x="' + (P + c[2] * CW) + '" y="' + (P + c[3] * RH) + '" width="' + NW + '" height="' + NH + '" rx="8"/><text x="' + cx(c) + '" y="' + (cy(c) + 4) + '" text-anchor="middle">' + e(c[1].length > 24 ? c[1].slice(0, 23) + '.' : c[1]) + '</text></g>';
  });
  return s + '</svg>';
}

function labView() {
  view.title = 'System design lab | MARGA by EknathaLabs'; view.nav = 'practice';
  var opts = DESIGNS.map(function (d) { return '<option value="' + d.id + '">' + e(d.title) + '</option>'; }).join('');
  view.html = '<section class="page-head wrap"><h1>System design lab</h1><p class="lede">Size a system, break a design and see how much of your error budget it costs, then fix a real outage. Everything runs in your browser. The simulator is a model with stated assumptions, not a measurement.</p>' +
    '<p class="small"><button type="button" class="btn btn-quiet sdl-j" data-to="sdl-est">Estimator</button> <button type="button" class="btn btn-quiet sdl-j" data-to="sdl-sim">Break it</button> <button type="button" class="btn btn-quiet sdl-j" data-to="sdl-ch">Case challenges</button> <a href="#/module/system-design">System design skill</a></p></section><div class="wrap narrow sdl">' +

    '<section class="calc" id="sdl-est" aria-labelledby="sdl-est-h"><h2 id="sdl-est-h">Estimator</h2><p class="small">Round numbers are fine. The aim is to find the figure that crosses a limit.</p><div class="calc-in">' +
    field('es-u', 'Daily active users', 20000000, 1) + field('es-p', 'Requests per user per day', 15, 0) + field('es-r', 'Share of requests that are reads (%)', 70, 0) + field('es-k', 'Response size (KB)', 5, 0) +
    field('es-w', 'Data written per user per day (KB)', 1, 0) + field('es-pk', 'Peak to average factor', 3, 1) + field('es-c', 'Copies of data', 3, 1) + field('es-cap', 'Requests per second one instance handles', 500, 1) +
    '<label class="field calc-f"><span>Availability target (%)</span><select id="es-slo"><option value="99">99</option><option value="99.9" selected>99.9</option><option value="99.99">99.99</option><option value="99.999">99.999</option></select></label></div>' +
    '<div id="es-out" aria-live="polite"></div></section>' +

    '<section class="calc" id="sdl-sim" aria-labelledby="sdl-sim-h"><h2 id="sdl-sim-h">Break it</h2><p class="small">Choose a design, then select a component to fail it. Switch on the fix to see what changes. Cost is the share of users affected times the minutes to recover, compared with your monthly error budget.</p>' +
    '<div class="calc-in"><label class="field calc-f"><span>Design</span><select id="sm-d">' + opts + '</select></label>' +
    '<label class="field calc-f"><span>Availability target (%)</span><select id="sm-slo"><option value="99.9">99.9</option><option value="99.99" selected>99.99</option></select></label></div>' +
    '<label class="opt-r"><input type="checkbox" id="sm-fix"> <span id="sm-fixl"></span></label><p class="small" id="sm-fixn"></p>' +
    '<div class="sd-wrap" id="sm-dia"></div><div id="sm-out" aria-live="polite"></div><p class="small">Assumptions: the minutes and percentages come from the written fault, they are illustrations for reasoning, and a real system needs its own numbers.</p></section>' +

    '<section class="calc" id="sdl-ch" aria-labelledby="sdl-ch-h"><h2 id="sdl-ch-h">Case challenges</h2><p class="small">Each one starts from a real outage in the case files. Choose the design change that bounds it best, then read what the organisation changed afterwards.</p><div id="ch-list"></div><p class="small" id="ch-score"></p></section></div>';
  view.after = labWire;
}

function labWire() {
  $$('.sdl-j').forEach(function (b) { b.addEventListener('click', function () { var t = document.getElementById(b.getAttribute('data-to')); if (t) { t.scrollIntoView({ block: 'start' }); var h = t.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } }); });
  /* estimator */
  var ids = { users: 'es-u', perUser: 'es-p', readPct: 'es-r', respKb: 'es-k', writeKb: 'es-w', peak: 'es-pk', copies: 'es-c', cap: 'es-cap', slo: 'es-slo' };
  function runEst() {
    var inp = {}; Object.keys(ids).forEach(function (k) { inp[k] = $('#' + ids[k]).value; });
    var r = estimate(inp), o = $('#es-out');
    if (r.error) { o.innerHTML = '<p class="calc-err" role="alert">' + e(r.error) + '</p>'; return; }
    o.innerHTML = '<dl class="calc-out">' + row('Requests per day', fmt(Math.round(r.perDay))) + row('Average requests per second', fmt(Math.round(r.avg))) + row('Peak requests per second', fmt(Math.round(r.peak))) +
      row('Peak writes per second', fmt(Math.round(r.writes))) + row('Peak egress', fmt(Math.round(r.egressMbit)) + ' Mbit/s') + row('Storage growth with copies', r1(r.perYearTb) + ' TB a year') +
      row('Instances at 60 percent load', r.instances + ' (' + r.withSpare + ' with one spare)') + row('Error budget', r1(r.budget) + ' minutes a month') + '</dl><ul class="sdl-notes">' + r.notes.map(function (n) { return '<li>' + e(n) + '</li>'; }).join('') + '</ul>';
  }
  Object.keys(ids).forEach(function (k) { var el = $('#' + ids[k]); el.addEventListener('input', runEst); el.addEventListener('change', runEst); });
  runEst();

  /* simulator */
  var sel = null;
  function cur() { for (var i = 0; i < DESIGNS.length; i++) if (DESIGNS[i].id === $('#sm-d').value) return DESIGNS[i]; return DESIGNS[0]; }
  function runSim() {
    var d = cur(), fixed = $('#sm-fix').checked, slo = +$('#sm-slo').value;
    if (!sel || !d.faults[sel]) sel = null;
    $('#sm-fixl').textContent = 'Apply the fix: ' + d.fixLabel; $('#sm-fixn').textContent = fixed ? d.fixNote : '';
    $('#sm-dia').innerHTML = diagram(d, fixed, sel);
    var out = $('#sm-out');
    if (!sel) {
      var all = Object.keys(d.faults).map(function (k) { var r = simulate(d, k, fixed, slo); return [k, r]; }), worst = all.reduce(function (a, b) { return b[1].cost > a[1].cost ? b : a; });
      out.innerHTML = '<p>Select a component above to fail it. Worst case in this design' + (fixed ? ' with the fix' : '') + ': <strong>' + e(d.faults[worst[0]][0]) + '</strong>, costing ' + r1(worst[1].pct) + ' percent of the monthly budget.</p>' +
        '<p class="small">Related lesson: <a href="' + A.hrefLesson(d.lesson) + '">' + e(d.lesson.split('/')[1].replace(/-/g, ' ')) + '</a>. Related case: <a href="#/case-file/' + e(d.case) + '">open the case file</a>.</p>';
      return;
    }
    var r = simulate(d, sel, fixed, slo), over = r.pct > 100;
    out.innerHTML = '<div class="sd-res ' + (over ? 'bad' : r.pct > 25 ? 'mid' : 'good') + '"><h3>' + e(r.label) + '</h3>' +
      '<div class="sd-bar" role="img" aria-label="' + r1(r.affected) + ' percent of users affected"><i style="width:' + Math.min(100, r.affected) + '%"></i></div>' +
      '<dl class="calc-out">' + row('Users affected', r1(r.affected) + ' percent') + row('Minutes to recover', fmt(r.minutes)) + row('Cost', r1(r.cost) + ' full-outage minutes') + row('Monthly budget at ' + slo + ' percent', r1(r.budget) + ' minutes') + row('Share of budget used', r1(r.pct) + ' percent') + '</dl>' +
      '<p>' + e(r.why) + '</p><p><strong>' + (over ? 'This one fault spends more than the whole month budget.' : r.pct > 25 ? 'A large part of the budget in one event.' : 'This fault stays within budget, but it still spends some of it.') + '</strong></p></div>';
  }
  $('#sm-d').addEventListener('change', function () { sel = null; $('#sm-fix').checked = false; runSim(); });
  $('#sm-slo').addEventListener('change', runSim); $('#sm-fix').addEventListener('change', runSim);
  $('#sm-dia').addEventListener('click', function (ev) { var g = ev.target.closest('[data-comp]'); if (g) { sel = g.getAttribute('data-comp'); runSim(); var n = $('[data-comp="' + sel + '"]'); if (n) n.focus(); } });
  $('#sm-dia').addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { var g = ev.target.closest('[data-comp]'); if (g) { ev.preventDefault(); sel = g.getAttribute('data-comp'); runSim(); var n = $('[data-comp="' + sel + '"]'); if (n) n.focus(); } } });
  runSim();

  /* challenges */
  var CF = {}; (D.casefiles || []).forEach(function (c) { CF[c.id] = c; });
  var CS = {}; (D.cases || []).forEach(function (c) { CS[c.id] = c; });
  function score() { var b = bag(), n = 0, ok = 0; CHALLENGES.forEach(function (c) { if (b[c.id] !== undefined) { n++; if (b[c.id]) ok++; } }); $('#ch-score').textContent = n ? ok + ' of ' + CHALLENGES.length + ' answered correctly (' + n + ' tried). Saved in this browser.' : ''; }
  $('#ch-list').innerHTML = CHALLENGES.map(function (c, i) {
    var cs = CS[c.id], title = cs ? cs.title || c.id : c.id;
    return '<article class="sd-ch" data-ch="' + i + '"><h3>' + e(title) + '</h3><p>' + e(c.ask) + '</p><div class="sd-opts" role="group" aria-label="Options">' +
      c.opts.map(function (o, j) { return '<button type="button" class="cf-opt" data-j="' + j + '">' + e(o[0]) + '</button>'; }).join('') + '</div><div class="sd-fb" hidden></div></article>';
  }).join('');
  $('#ch-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('.cf-opt'); if (!b) return; var art = b.closest('.sd-ch'); if (art.classList.contains('done')) return;
    var c = CHALLENGES[+art.getAttribute('data-ch')], o = c.opts[+b.getAttribute('data-j')], ok = !!o[1];
    art.classList.add('done'); $$('.cf-opt', art).forEach(function (x, j) { x.disabled = true; if (c.opts[j][1]) x.classList.add('right'); });
    b.classList.add(ok ? 'right' : 'wrong');
    var cf = CF[c.id], after = cf && cf.afterChanges ? '<p><strong>What the organisation changed afterwards:</strong></p><ul>' + cf.afterChanges.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul>' : '';
    var fb = $('.sd-fb', art); fb.hidden = false;
    fb.innerHTML = '<p><strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong> ' + e(o[2]) + '</p>' + after + '<p class="small"><a href="#/case-file/' + e(c.id) + '">Open the case file</a> &nbsp; <a href="' + A.hrefLesson(c.lesson) + '">Related lesson</a></p>';
    var s = bag(); s[c.id] = ok; A.save(); score();
  });
  score();
}

/* ---------------------------------------------------------------- mock design interview */
var PHASES = [
  { id: 'clarify', name: 'Clarify', min: 5, ask: 'Who uses it? What must never be wrong? What is the SLO? What is out of scope?', lesson: 'system-design/the-design-method-and-estimation',
    checks: ['I asked who uses the system and what must never be wrong', 'I stated an availability or latency target', 'I set the scope and said what is out'] },
  { id: 'estimate', name: 'Estimate', min: 5, ask: 'Requests per second (average and peak), storage, bandwidth. Which number crosses a limit?', lesson: 'system-design/the-design-method-and-estimation',
    checks: ['I turned users into requests per second with a peak factor', 'I estimated storage or bandwidth', 'I named the number that decides the design'] },
  { id: 'sketch', name: 'Sketch', min: 10, ask: 'Smallest design that meets the numbers. Read path, write path, data store, and why.', lesson: 'system-design/partitioning-sharding-and-consistent-hashing',
    checks: ['I drew the smallest design that meets the numbers', 'I chose a data store and said why', 'I showed both the read and the write path'] },
  { id: 'deep', name: 'Deep-dive', min: 12, ask: 'Design the riskiest part properly: data model and partitioning, consistency, rollout, or failover.', lesson: 'system-design/consistency-and-availability-in-practice',
    checks: ['I designed the riskiest part in detail', 'I chose a partition key or consistency level on purpose', 'I handled a hot spot or overload'] },
  { id: 'fail', name: 'Failure modes', min: 8, ask: 'For each box: slow, down, wrong, overloaded. What is shared? How far does a fault spread?', lesson: 'system-design/failure-domains-cells-and-bulkheads',
    checks: ['I walked the failure modes of each component', 'I found shared dependencies or single points', 'I described detection, recovery and blast radius'] },
  { id: 'trade', name: 'Trade-offs', min: 5, ask: 'What did you give up? What changes at 10x? Observability, security and cost in a line each.', lesson: 'system-design/capacity-planning-and-cost-trade-offs',
    checks: ['I said what the design gives up', 'I said what I would change at 10x', 'I covered observability, security and cost briefly'] }
];
var PROMPTS = [
  ['url-shortener', 'Design a URL shortener for 100 million new links a month.', 'system-design/worked-design-a-url-shortener'],
  ['rate-limiter', 'Design a rate limiter for an API gateway.', 'system-design/worked-design-a-rate-limiter-service'],
  ['notifications', 'Design a notification system for 50 million users.', 'system-design/worked-design-a-notification-fan-out-system'],
  ['metrics', 'Design a metrics and log pipeline for 2,000 services.', 'system-design/worked-design-a-metrics-and-log-pipeline'],
  ['k8s-platform', 'Design a multi-tenant Kubernetes platform for 150 teams.', 'system-design/worked-design-a-multi-tenant-kubernetes-platform'],
  ['dns', 'Design an authoritative DNS service.', 'system-design/worked-design-an-authoritative-dns-service'],
  ['global-api', 'Design a public API with a 99.99 percent availability SLO.', 'system-design/worked-design-global-api-at-four-nines'],
  ['status-page', 'Design a status page that survives the outage it reports.', 'system-design/worked-design-the-status-page-that-survives'],
  ['chat', 'Design a chat service with group conversations and message history.', ''],
  ['kv-store', 'Design a replicated key-value store.', 'system-design/quorum-leaders-and-split-brain'],
  ['cicd', 'Design a CI/CD platform used by 500 engineers.', ''],
  ['lock', 'Design a distributed lock service.', 'system-design/quorum-leaders-and-split-brain']
];
function scoreSession(checks) { var n = 0, t = 0; PHASES.forEach(function (p) { p.checks.forEach(function (c, i) { t++; if (checks[p.id + i]) n++; }); }); return { n: n, t: t, pct: t ? Math.round(n * 100 / t) : 0 }; }
function weakPhases(checks) { return PHASES.map(function (p) { var got = p.checks.filter(function (c, i) { return checks[p.id + i]; }).length; return { p: p, got: got }; }).filter(function (x) { return x.got < x.p.checks.length; }); }
function sdiBag() { var s = A.state(); if (!Array.isArray(s.sdi)) s.sdi = []; return s.sdi; }
function mmss(sec) { var m = Math.floor(Math.abs(sec) / 60), r = Math.abs(sec) % 60; return (sec < 0 ? '-' : '') + m + ':' + String(r).padStart(2, '0'); }

function interviewView() {
  view.title = 'Mock design interview | MARGA by EknathaLabs'; view.nav = 'practice';
  var hist = sdiBag().slice(-5).reverse();
  view.html = '<section class="page-head wrap"><h1>Mock design interview</h1><p class="lede">Practise a system design interview with the six steps and a clock. You write notes for each phase, then score yourself against a checklist. Nothing is sent anywhere.</p></section><div class="wrap narrow sdl" id="sdi">' +
    '<section class="calc" id="sdi-setup"><h2>Set up</h2><div class="calc-in"><label class="field calc-f"><span>Prompt</span><select id="sdi-p">' + PROMPTS.map(function (p) { return '<option value="' + p[0] + '">' + e(p[1]) + '</option>'; }).join('') + '</select></label>' +
    '<label class="field calc-f"><span>Length</span><select id="sdi-len"><option value="1">45 minutes (standard)</option><option value="0.5">25 minutes (short)</option></select></label></div>' +
    '<p class="small">Phases: ' + PHASES.map(function (p) { return e(p.name) + ' ' + p.min; }).join(', ') + ' minutes at standard length. Use the timer as guidance; you can move on early.</p>' +
    '<button type="button" class="btn btn-primary" id="sdi-go">Start the interview</button></section>' +
    '<div id="sdi-run" hidden></div>' +
    (hist.length ? '<section class="calc"><h2>Recent sessions</h2><ul class="sdl-notes">' + hist.map(function (h) { return '<li>' + e(h.prompt) + ': ' + h.pct + ' percent (' + e(h.date) + ')</li>'; }).join('') + '</ul></section>' : '') + '</div>';
  view.after = interviewWire;
}

function interviewWire() {
  var run = $('#sdi-run'), setup = $('#sdi-setup'), st = null, timer = null;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function drawPhase() {
    var p = PHASES[st.i], total = Math.round(p.min * st.scale * 60), left = total - st.sec;
    run.innerHTML = '<section class="calc"><h2>' + e(st.prompt[1]) + '</h2><p class="small">Phase ' + (st.i + 1) + ' of ' + PHASES.length + ': <strong>' + e(p.name) + '</strong></p>' +
      '<p class="sdi-clock" id="sdi-clock" role="timer" aria-live="off">' + mmss(left) + '</p><p>' + e(p.ask) + '</p>' +
      '<label class="field calc-f wide"><span>Your notes for this phase</span><textarea id="sdi-n" rows="6" spellcheck="false">' + e(st.notes[p.id] || '') + '</textarea></label>' +
      '<div class="actions"><button type="button" class="btn btn-primary" id="sdi-next">' + (st.i === PHASES.length - 1 ? 'Finish and score' : 'Next phase') + '</button> <button type="button" class="btn btn-quiet" id="sdi-quit">Stop</button></div></section>';
    $('#sdi-n').addEventListener('input', function (ev) { st.notes[p.id] = ev.target.value; });
    $('#sdi-next').addEventListener('click', function () { st.notes[p.id] = $('#sdi-n').value; if (st.i === PHASES.length - 1) { stopTimer(); drawScore(); } else { st.i++; st.sec = 0; drawPhase(); $('#sdi-n').focus(); } });
    $('#sdi-quit').addEventListener('click', function () { stopTimer(); run.hidden = true; setup.hidden = false; });
  }
  function tick() { if (!document.getElementById('sdi-clock')) { stopTimer(); return; } st.sec++; var p = PHASES[st.i], left = Math.round(p.min * st.scale * 60) - st.sec; var c = $('#sdi-clock'); c.textContent = mmss(left); c.classList.toggle('late', left < 0); }
  function drawScore() {
    run.innerHTML = '<section class="calc"><h2>Score yourself</h2><p class="small">Tick what you actually did. Be strict; an interviewer would be.</p>' +
      PHASES.map(function (p) { return '<fieldset class="sdi-fs"><legend>' + e(p.name) + '</legend>' + p.checks.map(function (c, i) { return '<label class="opt-r"><input type="checkbox" data-k="' + p.id + i + '"> <span>' + e(c) + '</span></label>'; }).join('') + '</fieldset>'; }).join('') +
      '<div class="actions"><button type="button" class="btn btn-primary" id="sdi-score">See my result</button></div></section>';
    $('#sdi-score').addEventListener('click', function () {
      var checks = {}; $$('#sdi-run input[data-k]').forEach(function (b) { if (b.checked) checks[b.getAttribute('data-k')] = true; });
      var r = scoreSession(checks), weak = weakPhases(checks), d = new Date(), date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var h = sdiBag(); h.push({ id: st.prompt[0], prompt: st.prompt[1], pct: r.pct, date: date }); if (h.length > 30) h.splice(0, h.length - 30); A.save();
      run.innerHTML = '<section class="calc" id="sdi-res"><h2>' + r.n + ' of ' + r.t + ' (' + r.pct + ' percent)</h2><p>' + (r.pct >= 80 ? 'A strong session. Repeat with a different prompt and a shorter clock.' : r.pct >= 50 ? 'A fair base. Work on the phases below, then try again.' : 'Keep the six steps in front of you and repeat. Short sessions help.') + '</p>' +
        (weak.length ? '<h3>Work on</h3><ul class="sdl-notes">' + weak.map(function (x) { return '<li>' + e(x.p.name) + ' (' + x.got + ' of ' + x.p.checks.length + '): <a href="' + A.hrefLesson(x.p.lesson) + '">review the lesson</a></li>'; }).join('') + '</ul>' : '<p>Every item ticked.</p>') +
        (st.prompt[2] ? '<p>Compare with the worked design: <a href="' + A.hrefLesson(st.prompt[2]) + '">open the lesson</a>.</p>' : '<p class="small">This prompt has no worked design yet. Use the six steps and the failure-mode tables from the worked designs as a guide.</p>') +
        '<div class="actions"><button type="button" class="btn btn-primary" id="sdi-again">Another session</button></div></section>';
      $('#sdi-again').addEventListener('click', function () { run.hidden = true; setup.hidden = false; $('#sdi-go').focus(); });
    });
  }
  $('#sdi-go').addEventListener('click', function () {
    var id = $('#sdi-p').value, pr = PROMPTS.filter(function (x) { return x[0] === id; })[0];
    st = { prompt: pr, scale: +$('#sdi-len').value, i: 0, sec: 0, notes: {} };
    setup.hidden = true; run.hidden = false; drawPhase(); $('#sdi-n').focus(); stopTimer(); timer = setInterval(tick, 1000);
  });
  window.MargaSDI = { score: scoreSession };
}
A.addRoute(/^\/design-interview$/, interviewView);
A.addRoute(/^\/system-design-lab$/, labView);
window.MargaSD = { score: scoreSession, prompts: PROMPTS, phases: PHASES, estimate: estimate, simulate: simulate, designs: DESIGNS, challenges: CHALLENGES };
};
