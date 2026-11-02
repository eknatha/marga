/* MARGA trade-off calculators. Plain arithmetic in the browser: nothing is sent anywhere.
   MargaCalc.math holds the formulas (tested in Node); MargaCalc.mount(el, id) draws one calculator. */
(function (root) {
'use strict';

var DAY_MIN = 1440;
function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function fmt(n, d) {
  if (!isFinite(n)) return 'n/a';
  var a = Math.abs(n);
  d = d === undefined ? (a >= 100 ? 0 : a >= 10 ? 1 : 2) : d;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
}
function money(n) { return '$' + fmt(n, n >= 100 ? 0 : 2); }
function dur(min) {
  if (!isFinite(min)) return 'n/a';
  if (min < 1) return fmt(min * 60, 1) + ' seconds';
  if (min < 120) return fmt(min, 1) + ' minutes';
  if (min < 2880) return fmt(min / 60, 1) + ' hours';
  return fmt(min / 1440, 1) + ' days';
}
function pct(x, d) { return fmt(x * 100, d === undefined ? 3 : d) + '%'; }
function binom(n, k) { var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }

var math = {
  /* minutes of allowed unavailability for an SLO (percent) over a window in days */
  budgetMinutes: function (slo, days) { return Math.max(0, (1 - slo / 100)) * days * DAY_MIN; },
  /* components that must all work */
  serial: function (list) { return list.reduce(function (p, a) { return p * a; }, 1); },
  /* components where any one is enough */
  parallel: function (list) { return 1 - list.reduce(function (p, a) { return p * (1 - a); }, 1); },
  /* probability that at least k of n independent replicas (each with availability a) are up */
  kOfN: function (n, k, a) {
    var s = 0;
    for (var i = k; i <= n; i++) s += binom(n, i) * Math.pow(a, i) * Math.pow(1 - a, n - i);
    return Math.min(1, Math.max(0, s));
  },
  /* monthly cost of the same fleet under three purchase options */
  cloudCost: function (o) {
    var od = o.instances * o.hours * o.rate;
    var reserved = o.instances * 730 * o.rate * (1 - o.reservedDiscount / 100);
    var spot = o.instances * o.hours * o.rate * (1 - o.spotDiscount / 100) * (1 + o.spotOverhead / 100);
    var breakEvenHours = (1 - o.reservedDiscount / 100) * 730;
    return { onDemand: od, reserved: reserved, spot: spot, breakEvenHours: breakEvenHours, breakEvenShare: breakEvenHours / 730 };
  },
  /* restore time for a plain backup-and-restore plan */
  recovery: function (o) {
    var restoreMin = (o.sizeGb * 1024) / Math.max(0.001, o.mbps) / 60;
    return { restoreMin: restoreMin, rtoMin: restoreMin + o.detectMin + o.opsMin, rpoMin: o.backupHours * 60 };
  },
  /* worst case multiplication of load when every layer retries failed calls */
  retryLoad: function (layers, retries) { return Math.pow(1 + retries, layers); },
  /* load multiplier when each layer may only add a fraction of extra calls (retry budget) */
  retryBudgetLoad: function (layers, budgetPct) { return Math.pow(1 + budgetPct / 100, layers); },
  /* share of users hit by one failing cell, and what the extra cells cost */
  cells: function (o) {
    var n = Math.max(1, Math.round(o.cells));
    return { blastShare: 1 / n, usersHit: o.users / n, costMultiplier: 1 + (o.overheadPct / 100) * (n - 1) };
  },
  /* servers needed for a peak, with headroom and survival of one zone loss */
  capacity: function (o) {
    var base = Math.ceil(o.peakRps / (o.perNodeRps * (o.targetUtil / 100)));
    var zones = Math.max(1, Math.round(o.zones));
    var total = base;
    if (o.surviveZone && zones > 1) total = Math.ceil(base * zones / (zones - 1));
    if (zones > 1) total = Math.ceil(total / zones) * zones;
    return { base: base, total: total, perZone: zones > 1 ? total / zones : total, extraPct: base ? (total / base - 1) : 0, zones: zones };
  }
};

/* ---------- calculator definitions ---------- */
var CALCS = [
  {
    id: 'error-budget', title: 'Error budget and chained availability',
    blurb: 'How much downtime an SLO allows, and what happens to availability when services depend on each other.',
    inputs: [
      { id: 'slo', label: 'SLO target', value: 99.9, min: 90, max: 99.9999, step: 0.001, unit: '%' },
      { id: 'days', label: 'Window', value: 30, min: 1, max: 365, step: 1, unit: 'days' },
      { id: 'deps', label: 'Services in the request path', value: 4, min: 1, max: 20, step: 1, unit: '' },
      { id: 'each', label: 'Availability of each service', value: 99.9, min: 90, max: 99.9999, step: 0.001, unit: '%' }
    ],
    compute: function (v) {
      var budget = math.budgetMinutes(v.slo, v.days);
      var chain = math.serial(new Array(Math.round(v.deps)).fill(v.each / 100));
      var chainDown = (1 - chain) * v.days * DAY_MIN;
      return [
        ['Allowed downtime', dur(budget), 'Your error budget for the window.'],
        ['Chain availability', pct(chain, 4), v.deps + ' services at ' + fmt(v.each, 4) + '% each, all required.'],
        ['Chain downtime', dur(chainDown), chain * 100 < v.slo ? 'The chain misses the ' + fmt(v.slo, 4) + '% target.' : 'The chain meets the target.'],
        ['Rule of thumb', 'Each dependency must be better than the SLO', 'Serial dependencies multiply, so the whole is always worse than its weakest part.']
      ];
    }
  },
  {
    id: 'redundancy', title: 'Redundancy: how many replicas',
    blurb: 'Availability of n replicas when at least k must be healthy, assuming failures are independent.',
    inputs: [
      { id: 'a', label: 'Availability of one replica', value: 99, min: 50, max: 99.99, step: 0.01, unit: '%' },
      { id: 'n', label: 'Replicas (n)', value: 3, min: 1, max: 15, step: 1, unit: '' },
      { id: 'k', label: 'Needed to serve load (k)', value: 2, min: 1, max: 15, step: 1, unit: '' },
      { id: 'cost', label: 'Cost per replica per month', value: 100, min: 0, max: 100000, step: 1, unit: '$' }
    ],
    compute: function (v) {
      var n = Math.round(v.n), k = Math.min(Math.round(v.k), n), a = v.a / 100;
      var av = math.kOfN(n, k, a), one = math.kOfN(k, k, a);
      return [
        ['Availability', pct(av, 5), n + ' replicas, ' + k + ' needed.'],
        ['Compared with no spare', pct(one, 5), k + ' replicas and no spare.'],
        ['Downtime per 30 days', dur((1 - av) * 30 * DAY_MIN), 'Versus ' + dur((1 - one) * 30 * DAY_MIN) + ' with no spare.'],
        ['Monthly cost', money(n * v.cost), (n - k) + ' spare replica(s) add ' + money((n - k) * v.cost) + '.'],
        ['Caveat', 'Failures are rarely independent', 'Shared zones, deployments and configuration make real availability lower than this number.']
      ];
    }
  },
  {
    id: 'cloud-cost', title: 'On-demand, reserved or spot',
    blurb: 'Monthly cost of a fleet under three purchase options. Enter your own prices; the defaults are illustrative.',
    inputs: [
      { id: 'instances', label: 'Instances', value: 10, min: 1, max: 10000, step: 1, unit: '' },
      { id: 'hours', label: 'Hours used per month (max 730)', value: 500, min: 1, max: 730, step: 1, unit: 'h' },
      { id: 'rate', label: 'On-demand price per instance hour', value: 0.20, min: 0.001, max: 100, step: 0.001, unit: '$' },
      { id: 'reservedDiscount', label: 'Reserved discount', value: 40, min: 0, max: 90, step: 1, unit: '%' },
      { id: 'spotDiscount', label: 'Spot discount', value: 65, min: 0, max: 95, step: 1, unit: '%' },
      { id: 'spotOverhead', label: 'Extra work from interruptions', value: 10, min: 0, max: 100, step: 1, unit: '%' }
    ],
    compute: function (v) {
      var r = math.cloudCost(v);
      var best = Math.min(r.onDemand, r.reserved, r.spot);
      var name = best === r.spot ? 'Spot' : best === r.reserved ? 'Reserved' : 'On-demand';
      return [
        ['On-demand', money(r.onDemand), 'Pay only for hours used.'],
        ['Reserved', money(r.reserved), 'Paid for all 730 hours, used or not.'],
        ['Spot', money(r.spot), 'Cheapest per hour, but instances can be reclaimed. Only for work that tolerates it.'],
        ['Cheapest here', name, 'Reserved beats on-demand once usage passes ' + fmt(r.breakEvenHours, 0) + ' hours a month (' + fmt(r.breakEvenShare * 100, 0) + '%).']
      ];
    }
  },
  {
    id: 'recovery', title: 'Backup, RTO and RPO',
    blurb: 'How long a restore takes and how much data you can lose with plain backups, and what stronger strategies cost.',
    inputs: [
      { id: 'sizeGb', label: 'Data to restore', value: 500, min: 1, max: 1000000, step: 1, unit: 'GB' },
      { id: 'mbps', label: 'Restore throughput', value: 200, min: 1, max: 100000, step: 1, unit: 'MB/s' },
      { id: 'backupHours', label: 'Backup every', value: 24, min: 0.1, max: 720, step: 0.1, unit: 'h' },
      { id: 'detectMin', label: 'Time to notice and decide', value: 20, min: 0, max: 1440, step: 1, unit: 'min' },
      { id: 'opsMin', label: 'Time to rebuild the rest', value: 60, min: 0, max: 2880, step: 1, unit: 'min' },
      { id: 'base', label: 'Monthly cost of the primary site', value: 10000, min: 0, max: 100000000, step: 100, unit: '$' }
    ],
    compute: function (v) {
      var r = math.recovery(v);
      return [
        ['Restore time', dur(r.restoreMin), 'Data copy only: ' + fmt(v.sizeGb, 0) + ' GB at ' + fmt(v.mbps, 0) + ' MB/s.'],
        ['RTO (time to recover)', dur(r.rtoMin), 'Includes noticing and rebuilding.'],
        ['RPO (worst data loss)', dur(r.rpoMin), 'Everything since the last backup.'],
        ['Backup and restore', money(v.base * 1.1) + ' per month', 'About 1.1 times the primary. Recovery in hours.'],
        ['Pilot light', money(v.base * 1.3) + ' per month', 'About 1.3 times. Core pieces run, the rest starts on demand. Tens of minutes to hours.'],
        ['Warm standby', money(v.base * 1.6) + ' per month', 'About 1.6 times. A smaller copy runs all the time. Minutes.'],
        ['Active-active', money(v.base * 2.1) + ' per month', 'About 2 times or more. Seconds, but needs data replication and conflict handling.']
      ];
    }
  },
  {
    id: 'retries', title: 'Retry storm',
    blurb: 'If every layer retries a failing call, load on the bottom service multiplies. A retry budget keeps it bounded.',
    inputs: [
      { id: 'layers', label: 'Layers that retry', value: 4, min: 1, max: 10, step: 1, unit: '' },
      { id: 'retries', label: 'Retries per layer', value: 3, min: 0, max: 10, step: 1, unit: '' },
      { id: 'rps', label: 'Normal requests per second at the top', value: 200, min: 1, max: 1000000, step: 1, unit: 'rps' },
      { id: 'budget', label: 'Retry budget per layer', value: 10, min: 0, max: 100, step: 1, unit: '%' }
    ],
    compute: function (v) {
      var m = math.retryLoad(Math.round(v.layers), Math.round(v.retries));
      var b = math.retryBudgetLoad(Math.round(v.layers), v.budget);
      return [
        ['Worst-case multiplier', fmt(m, 1) + 'x', (1 + Math.round(v.retries)) + ' attempts at each of ' + Math.round(v.layers) + ' layers.'],
        ['Load on the failing service', fmt(v.rps * m, 0) + ' rps', 'Versus ' + fmt(v.rps, 0) + ' rps normally. A struggling service gets more traffic exactly when it is weakest.'],
        ['With a ' + fmt(v.budget, 0) + '% retry budget', fmt(b, 2) + 'x', fmt(v.rps * b, 0) + ' rps at most.'],
        ['What to do', 'Retry at one layer, with backoff and jitter', 'Add timeouts, a retry budget and a circuit breaker.']
      ];
    }
  },
  {
    id: 'cells', title: 'Cells and blast radius',
    blurb: 'Splitting users across independent cells shrinks the damage from one failure and raises the cost of running more copies.',
    inputs: [
      { id: 'users', label: 'Users', value: 1000000, min: 1, max: 1000000000, step: 1000, unit: '' },
      { id: 'cells', label: 'Cells', value: 8, min: 1, max: 200, step: 1, unit: '' },
      { id: 'overheadPct', label: 'Fixed overhead per extra cell', value: 4, min: 0, max: 100, step: 0.5, unit: '%' }
    ],
    compute: function (v) {
      var r = math.cells(v);
      return [
        ['One cell fails', pct(r.blastShare, 2) + ' of users', fmt(r.usersHit, 0) + ' users affected.'],
        ['Cost multiplier', fmt(r.costMultiplier, 2) + 'x', 'Each extra cell adds ' + fmt(v.overheadPct, 1) + '% fixed overhead (control plane, minimum capacity, operations).'],
        ['Trade-off', 'Smaller blast radius, more to operate', 'Cells need a router, per-cell deployments and a plan for moving users between cells.']
      ];
    }
  },
  {
    id: 'capacity', title: 'Capacity and zone loss',
    blurb: 'How many servers a peak needs with safe headroom, and how many more you need to survive losing one zone.',
    inputs: [
      { id: 'peakRps', label: 'Peak requests per second', value: 5000, min: 1, max: 100000000, step: 10, unit: 'rps' },
      { id: 'perNodeRps', label: 'Throughput of one server at 100%', value: 400, min: 1, max: 1000000, step: 1, unit: 'rps' },
      { id: 'targetUtil', label: 'Target utilisation at peak', value: 60, min: 10, max: 95, step: 1, unit: '%' },
      { id: 'zones', label: 'Availability zones', value: 3, min: 1, max: 6, step: 1, unit: '' },
      { id: 'surviveZone', label: 'Survive losing one zone (1 = yes, 0 = no)', value: 1, min: 0, max: 1, step: 1, unit: '' },
      { id: 'nodeCost', label: 'Cost per server per month', value: 150, min: 0, max: 100000, step: 1, unit: '$' }
    ],
    compute: function (v) {
      var r = math.capacity(v);
      return [
        ['Servers for the peak', fmt(r.base, 0), 'At ' + fmt(v.targetUtil, 0) + '% utilisation.'],
        ['Servers to deploy', fmt(r.total, 0), fmt(r.perZone, 0) + ' per zone across ' + r.zones + ' zone(s).'],
        ['Cost of resilience', pct(r.extraPct, 0) + ' extra', 'About ' + money((r.total - r.base) * v.nodeCost) + ' per month more than the bare minimum.'],
        ['Monthly cost', money(r.total * v.nodeCost), 'Servers only; add storage, network and licences.']
      ];
    }
  }
];

/* ---------- renderer ---------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
var uid = 0;
function mount(el, id) {
  var c = CALCS.filter(function (x) { return x.id === id; })[0];
  if (!el || !c) return false;
  var n = ++uid;
  var ins = c.inputs.map(function (i) {
    return '<label class="field calc-f" for="c' + n + i.id + '"><span>' + esc(i.label) + (i.unit ? ' (' + esc(i.unit) + ')' : '') + '</span>' +
      '<input id="c' + n + i.id + '" data-in="' + i.id + '" type="number" inputmode="decimal" value="' + i.value + '" min="' + i.min + '" max="' + i.max + '" step="' + i.step + '"></label>';
  }).join('');
  el.innerHTML = '<div class="calc" data-calc="' + c.id + '"><h3>' + esc(c.title) + '</h3><p class="small">' + esc(c.blurb) + '</p>' +
    '<div class="calc-in">' + ins + '</div><dl class="calc-out" aria-live="polite"></dl>' +
    '<p class="small calc-note">Estimates from the numbers you enter. Prices and ratios are examples, not quotes.</p></div>';
  var box = el.querySelector('.calc');
  function run() {
    var v = {};
    c.inputs.forEach(function (i) {
      var f = box.querySelector('[data-in="' + i.id + '"]');
      v[i.id] = clamp(num(f.value, i.value), i.min, i.max);
    });
    box.querySelector('.calc-out').innerHTML = c.compute(v).map(function (r) {
      return '<div class="calc-row"><dt>' + esc(r[0]) + '</dt><dd><b>' + esc(r[1]) + '</b><span>' + esc(r[2]) + '</span></dd></div>';
    }).join('');
  }
  box.addEventListener('input', run);
  run();
  return true;
}

var api = { math: math, list: CALCS.map(function (c) { return { id: c.id, title: c.title, blurb: c.blurb }; }), mount: mount, _defs: CALCS, fmt: fmt };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.MargaCalc = api;
})(typeof window !== 'undefined' ? window : this);
