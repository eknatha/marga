## List every service
id: select
task: Show the name and tier of every service, ordered by name.
hint: SELECT columns FROM table ORDER BY column.
@@ start
SELECT * FROM services;
@@ sol
SELECT name, tier FROM services ORDER BY name;

## Only the critical services
id: where
task: Show the names of services with tier 1, ordered by name.
hint: WHERE tier = 1.
@@ start
SELECT name FROM services;
@@ sol
SELECT name FROM services WHERE tier = 1 ORDER BY name;

## Count the failed deploys
id: count
task: How many deploys have a status other than ok? Return a single number.
hint: COUNT(*) with WHERE status <> 'ok'.
@@ start
SELECT COUNT(*) FROM deploys;
@@ sol
SELECT COUNT(*) FROM deploys WHERE status <> 'ok';

## Deploys per service
id: groupby
task: For each service id, count its deploys. Show service_id and the count, most deploys first, then lowest service_id first.
hint: GROUP BY service_id, then ORDER BY the count DESC, service_id.
@@ start
SELECT service_id, COUNT(*) FROM deploys;
@@ sol
SELECT service_id, COUNT(*) AS n FROM deploys GROUP BY service_id ORDER BY n DESC, service_id;

## Service names with their deploys
id: join
task: List the service name and version for every deploy that was rolled back (status rolled_back), ordered by deployed_at.
hint: JOIN services ON services.id = deploys.service_id.
@@ start
SELECT version FROM deploys WHERE status = 'rolled_back';
@@ sol
SELECT s.name, d.version FROM deploys d JOIN services s ON s.id = d.service_id WHERE d.status = 'rolled_back' ORDER BY d.deployed_at;

## Services that never had an incident
id: leftjoin
task: Which services have no incident at all? Show their names, ordered by name.
hint: LEFT JOIN incidents and keep the rows where the incident id IS NULL.
@@ start
SELECT name FROM services;
@@ sol
SELECT s.name FROM services s LEFT JOIN incidents i ON i.service_id = s.id WHERE i.id IS NULL ORDER BY s.name;

## Mean time to resolve, in minutes
id: mttr
task: Compute the average resolution time in minutes (rounded to 1 decimal) over incidents that are resolved. Use julianday to subtract the times.
hint: (julianday(resolved_at) - julianday(started_at)) * 24 * 60, then AVG, then ROUND(..., 1).
@@ start
SELECT COUNT(*) FROM incidents WHERE resolved_at IS NOT NULL;
@@ sol
SELECT ROUND(AVG((julianday(resolved_at) - julianday(started_at)) * 24 * 60), 1) FROM incidents WHERE resolved_at IS NOT NULL;

## The most common cause
id: cause
task: Count incidents by cause and show the cause and count, most common first, then cause name.
hint: GROUP BY cause and ORDER BY COUNT(*) DESC, cause.
@@ start
SELECT DISTINCT cause FROM incidents;
@@ sol
SELECT cause, COUNT(*) AS n FROM incidents GROUP BY cause ORDER BY n DESC, cause;

## Open incidents
id: open
task: Show the id and severity of incidents that are not resolved yet.
hint: resolved_at IS NULL, not = NULL.
@@ start
SELECT id, severity FROM incidents;
@@ sol
SELECT id, severity FROM incidents WHERE resolved_at IS NULL;

## Services with many severity 1 incidents
id: having
task: Show service names that had at least 2 incidents of severity 1 or 2, with the count. Order by count descending, then name.
hint: Filter rows with WHERE severity <= 2, group, then use HAVING COUNT(*) >= 2.
@@ start
SELECT s.name, COUNT(*) FROM incidents i JOIN services s ON s.id = i.service_id GROUP BY s.name;
@@ sol
SELECT s.name, COUNT(*) AS n FROM incidents i JOIN services s ON s.id = i.service_id WHERE i.severity <= 2 GROUP BY s.name HAVING COUNT(*) >= 2 ORDER BY n DESC, s.name;

## Error rate per day
id: errorrate
task: For service 1 (checkout) show each day and its error percentage, failed * 100.0 / total rounded to 3 decimals, ordered by day.
hint: ROUND(failed * 100.0 / total, 3). Use 100.0 so that SQLite does not use integer division.
@@ start
SELECT day, failed, total FROM slo_daily WHERE service_id = 1;
@@ sol
SELECT day, ROUND(failed * 100.0 / total, 3) FROM slo_daily WHERE service_id = 1 ORDER BY day;

## Days that broke the 99.9 percent SLO
id: slobreach
task: Show service_id and day for every day where the success rate was below 99.9 percent (failed * 1.0 / total greater than 0.001). Order by service_id, day.
hint: Compare failed * 1.0 / total with 0.001.
@@ start
SELECT service_id, day FROM slo_daily;
@@ sol
SELECT service_id, day FROM slo_daily WHERE failed * 1.0 / total > 0.001 ORDER BY service_id, day;

## Overall availability per service
id: availability
task: For each service in slo_daily show its name and the overall success rate in percent, (1 - SUM(failed) / SUM(total)) * 100 rounded to 3 decimals. Order by name.
hint: Divide sums, not averages of daily rates. Multiply by 1.0 to avoid integer division.
@@ start
SELECT service_id, SUM(failed), SUM(total) FROM slo_daily GROUP BY service_id;
@@ sol
SELECT s.name, ROUND((1 - SUM(d.failed) * 1.0 / SUM(d.total)) * 100, 3) FROM slo_daily d JOIN services s ON s.id = d.service_id GROUP BY s.name ORDER BY s.name;

## Time to acknowledge
id: ack
task: For alerts that were acknowledged, show the alert name and the minutes between fired_at and acked_at as a whole number (round it). Order by that number descending, then alert id.
hint: ROUND((julianday(acked_at) - julianday(fired_at)) * 24 * 60). Skip rows where acked_at IS NULL.
@@ start
SELECT name, fired_at, acked_at FROM alerts WHERE acked_at IS NOT NULL;
@@ sol
SELECT name, CAST(ROUND((julianday(acked_at) - julianday(fired_at)) * 24 * 60) AS INTEGER) AS mins FROM alerts WHERE acked_at IS NOT NULL ORDER BY mins DESC, id;

## Alerts that never paged and never got acknowledged
id: noisy
task: Show alert id and name for alerts with paged = 0 and no acknowledgement, ordered by id. These are often noise or ignored.
hint: Combine paged = 0 with acked_at IS NULL.
@@ start
SELECT id, name FROM alerts;
@@ sol
SELECT id, name FROM alerts WHERE paged = 0 AND acked_at IS NULL ORDER BY id;

## The latest deploy of each service
id: latest
task: For every service that has deploys, show its name and the version of its most recent deploy. Order by name.
hint: Use a subquery with MAX(deployed_at) per service_id, then join it back.
@@ start
SELECT service_id, MAX(deployed_at) FROM deploys GROUP BY service_id;
@@ sol
SELECT s.name, d.version FROM deploys d JOIN services s ON s.id = d.service_id WHERE d.deployed_at = (SELECT MAX(d2.deployed_at) FROM deploys d2 WHERE d2.service_id = d.service_id) ORDER BY s.name;

## Did an incident follow a deploy?
id: afterdeploy
task: Show incident ids that started within 60 minutes after a deploy of the same service. A deploy started at or before the incident, and the gap is at most 60 minutes. Order by incident id, and list each id once.
hint: Join incidents to deploys on service_id and compare julianday values. Use DISTINCT.
@@ start
SELECT id FROM incidents WHERE cause = 'bad deploy';
@@ sol
SELECT DISTINCT i.id FROM incidents i JOIN deploys d ON d.service_id = i.service_id WHERE d.deployed_at <= i.started_at AND (julianday(i.started_at) - julianday(d.deployed_at)) * 24 * 60 <= 60 ORDER BY i.id;

## Rank services by incident minutes
id: downtime
task: Show each service name and the total minutes of resolved incidents (rounded to whole minutes), highest first, then name. Include only services with at least one resolved incident.
hint: SUM over (julianday(resolved_at) - julianday(started_at)) * 24 * 60 and ROUND.
@@ start
SELECT service_id, started_at, resolved_at FROM incidents;
@@ sol
SELECT s.name, CAST(ROUND(SUM((julianday(i.resolved_at) - julianday(i.started_at)) * 24 * 60)) AS INTEGER) AS mins FROM incidents i JOIN services s ON s.id = i.service_id WHERE i.resolved_at IS NOT NULL GROUP BY s.name ORDER BY mins DESC, s.name;

## Teams ranked by failed deploy share
id: teamfail
task: For each team, show the team and the percentage of its deploys whose status is not ok, rounded to 1 decimal. Order by percentage descending, then team.
hint: Join services to deploys, then AVG(CASE WHEN status <> 'ok' THEN 100.0 ELSE 0 END).
@@ start
SELECT team FROM services;
@@ sol
SELECT s.team, ROUND(AVG(CASE WHEN d.status <> 'ok' THEN 100.0 ELSE 0 END), 1) AS pct FROM deploys d JOIN services s ON s.id = d.service_id GROUP BY s.team ORDER BY pct DESC, s.team;

## Who deploys the most risky changes?
id: deployer
task: Show each deployer and how many of their deploys had a status other than ok. Include only deployers with at least one, ordered by that count descending, then name.
hint: GROUP BY deployer with WHERE status <> 'ok'.
@@ start
SELECT deployer, COUNT(*) FROM deploys GROUP BY deployer;
@@ sol
SELECT deployer, COUNT(*) AS n FROM deploys WHERE status <> 'ok' GROUP BY deployer ORDER BY n DESC, deployer;
