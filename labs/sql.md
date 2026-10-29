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

## Services with no incidents
id: noinc
task: List the names of services that have never had an incident, ordered by name.
hint: NOT EXISTS with a correlated subquery, or LEFT JOIN with IS NULL.
@@ start
SELECT name FROM services;
@@ sol
SELECT name FROM services s WHERE NOT EXISTS (SELECT 1 FROM incidents i WHERE i.service_id = s.id) ORDER BY name;

## Latest deploy per service
id: latestdeploy
task: For every service that has deploys, show the service name and the version of its most recent deploy. Order by service name.
hint: Compare deployed_at with MAX(deployed_at) in a subquery, or use ROW_NUMBER over a partition.
@@ start
SELECT service_id, version FROM deploys;
@@ sol
SELECT s.name, d.version FROM deploys d JOIN services s ON s.id = d.service_id WHERE d.deployed_at = (SELECT MAX(d2.deployed_at) FROM deploys d2 WHERE d2.service_id = d.service_id) ORDER BY s.name;

## Worst day per service
id: worstday
task: For each service in slo_daily, show the service_id, the day with the highest failed count, and that count. Order by service_id.
hint: ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY failed DESC) in a subquery, then keep rank 1.
@@ start
SELECT service_id, day, failed FROM slo_daily;
@@ sol
SELECT service_id, day, failed FROM (SELECT service_id, day, failed, ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY failed DESC) AS rn FROM slo_daily) WHERE rn = 1 ORDER BY service_id;

## Three-day rolling error rate
id: rolling
task: For service 1, show each day and the average failed count over that day and the two days before it (use only the days that exist), rounded to 1 decimal. Order by day.
hint: AVG(failed) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW).
@@ start
SELECT day, failed FROM slo_daily WHERE service_id = 1 ORDER BY day;
@@ sol
SELECT day, ROUND(AVG(failed) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS avg3 FROM slo_daily WHERE service_id = 1 ORDER BY day;

## Day over day change in p99
id: lagp99
task: For service 7, show each day, its p99_ms, and the change from the previous day (NULL for the first day). Order by day.
hint: LAG(p99_ms) OVER (ORDER BY day).
@@ start
SELECT day, p99_ms FROM slo_daily WHERE service_id = 7 ORDER BY day;
@@ sol
SELECT day, p99_ms, p99_ms - LAG(p99_ms) OVER (ORDER BY day) AS change FROM slo_daily WHERE service_id = 7 ORDER BY day;

## Time to acknowledge
id: tta
task: For every alert that was acknowledged, show its id and the minutes between fired_at and acked_at, as a whole number. Order by minutes descending, then id.
hint: (julianday(acked_at) - julianday(fired_at)) * 24 * 60, cast to INTEGER after rounding.
@@ start
SELECT id, fired_at, acked_at FROM alerts WHERE acked_at IS NOT NULL;
@@ sol
SELECT id, CAST(ROUND((julianday(acked_at) - julianday(fired_at)) * 24 * 60) AS INTEGER) AS mins FROM alerts WHERE acked_at IS NOT NULL ORDER BY mins DESC, id;

## Alerts that were never acknowledged
id: unacked
task: Show the id, name and service name of every alert with no acknowledgement time, ordered by alert id.
hint: acked_at IS NULL, joined to services.
@@ start
SELECT id, name FROM alerts;
@@ sol
SELECT a.id, a.name, s.name AS service FROM alerts a JOIN services s ON s.id = a.service_id WHERE a.acked_at IS NULL ORDER BY a.id;

## Alerts that fired without an incident
id: alertnoinc
task: Show the alert ids that were not followed by an incident on the same service within 30 minutes after the alert fired. Order by id.
hint: NOT EXISTS with a join condition on service_id and the time window using julianday.
@@ start
SELECT id FROM alerts;
@@ sol
SELECT a.id FROM alerts a WHERE NOT EXISTS (SELECT 1 FROM incidents i WHERE i.service_id = a.service_id AND i.started_at >= a.fired_at AND (julianday(i.started_at) - julianday(a.fired_at)) * 24 * 60 <= 30) ORDER BY a.id;

## Page rate per alert name
id: pagerate
task: For each alert name, show the name, how many times it fired and how many of those paged, ordered by fired count descending, then name.
hint: COUNT(*) and SUM(paged).
@@ start
SELECT name, COUNT(*) FROM alerts GROUP BY name;
@@ sol
SELECT name, COUNT(*) AS fired, SUM(paged) AS paged FROM alerts GROUP BY name ORDER BY fired DESC, name;

## Days that missed a 99.9 percent objective
id: missed
task: Show service_id and day for rows where the success rate was below 99.9 percent (failed divided by total above 0.001). Order by service_id, then day.
hint: failed * 1.0 / total > 0.001.
@@ start
SELECT service_id, day FROM slo_daily;
@@ sol
SELECT service_id, day FROM slo_daily WHERE failed * 1.0 / total > 0.001 ORDER BY service_id, day;

## Error budget used so far
id: budgetused
task: For each service in slo_daily, with a 99.9 percent objective, show the service_id and the percentage of the allowed failures that were used (sum of failed divided by 0.1 percent of the sum of total), rounded to 1 decimal. Order by service_id.
hint: ROUND(100.0 * SUM(failed) / (0.001 * SUM(total)), 1).
@@ start
SELECT service_id, SUM(failed), SUM(total) FROM slo_daily GROUP BY service_id;
@@ sol
SELECT service_id, ROUND(100.0 * SUM(failed) / (0.001 * SUM(total)), 1) AS used FROM slo_daily GROUP BY service_id ORDER BY service_id;

## Busiest deploy hour
id: deployhour
task: Show the hour of day (as two characters, 00 to 23) and the number of deploys that started in that hour, for the three busiest hours. Break ties by hour ascending.
hint: strftime('%H', deployed_at), GROUP BY, ORDER BY count DESC, LIMIT 3.
@@ start
SELECT deployed_at FROM deploys;
@@ sol
SELECT strftime('%H', deployed_at) AS hr, COUNT(*) AS n FROM deploys GROUP BY hr ORDER BY n DESC, hr LIMIT 3;

## Weekend deploys
id: weekend
task: List the id and deployed_at of deploys made on a Saturday or Sunday, ordered by id.
hint: strftime('%w', date) returns 0 for Sunday and 6 for Saturday.
@@ start
SELECT id, deployed_at FROM deploys;
@@ sol
SELECT id, deployed_at FROM deploys WHERE strftime('%w', deployed_at) IN ('0', '6') ORDER BY id;

## Services with the most incident causes
id: causes
task: For each service name, show the number of distinct incident causes it has had. Include only services with at least 2 distinct causes. Order by count descending, then name.
hint: COUNT(DISTINCT cause) with HAVING.
@@ start
SELECT service_id, cause FROM incidents;
@@ sol
SELECT s.name, COUNT(DISTINCT i.cause) AS n FROM incidents i JOIN services s ON s.id = i.service_id GROUP BY s.name HAVING n >= 2 ORDER BY n DESC, s.name;

## List the causes of each service
id: groupcause
task: For each service name that has incidents, show the name and its distinct causes joined with a comma and a space, sorted alphabetically inside the list. Order by name.
hint: Use a subquery with DISTINCT and ORDER BY, then GROUP_CONCAT.
@@ start
SELECT service_id, cause FROM incidents;
@@ sol
SELECT s.name, GROUP_CONCAT(c.cause, ', ') AS causes FROM services s JOIN (SELECT DISTINCT service_id, cause FROM incidents ORDER BY cause) c ON c.service_id = s.id GROUP BY s.name ORDER BY s.name;

## Longest incident per severity
id: longestsev
task: For each severity, show the severity and the longest resolved incident duration in minutes (whole number). Order by severity.
hint: MAX over the julianday difference, only where resolved_at is not null.
@@ start
SELECT severity, started_at, resolved_at FROM incidents;
@@ sol
SELECT severity, CAST(ROUND(MAX((julianday(resolved_at) - julianday(started_at)) * 24 * 60)) AS INTEGER) AS mins FROM incidents WHERE resolved_at IS NOT NULL GROUP BY severity ORDER BY severity;

## Share of incidents caused by deploys
id: deployshare
task: Show a single number: the percentage of all incidents whose cause is 'bad deploy', rounded to 1 decimal.
hint: 100.0 * SUM(CASE WHEN ... THEN 1 ELSE 0 END) / COUNT(*).
@@ start
SELECT COUNT(*) FROM incidents;
@@ sol
SELECT ROUND(100.0 * SUM(CASE WHEN cause = 'bad deploy' THEN 1 ELSE 0 END) / COUNT(*), 1) FROM incidents;

## Deploys followed by a rollback
id: rollbackpair
task: For each rolled back deploy, show its id and the id of the next deploy of the same service (the one with the smallest later deployed_at). If there is none, show NULL. Order by the rolled back deploy id.
hint: A correlated subquery that selects MIN(id) among later deploys, or LEAD over a partition.
@@ start
SELECT id FROM deploys WHERE status = 'rolled_back';
@@ sol
SELECT d.id, (SELECT n.id FROM deploys n WHERE n.service_id = d.service_id AND n.deployed_at > d.deployed_at ORDER BY n.deployed_at LIMIT 1) AS next_id FROM deploys d WHERE d.status = 'rolled_back' ORDER BY d.id;

## Tier 1 services with an open incident
id: opentier1
task: Show the names of tier 1 services that have an incident with no resolved_at, ordered by name.
hint: Join services and incidents, filter tier = 1 and resolved_at IS NULL.
@@ start
SELECT name FROM services WHERE tier = 1;
@@ sol
SELECT DISTINCT s.name FROM services s JOIN incidents i ON i.service_id = s.id WHERE s.tier = 1 AND i.resolved_at IS NULL ORDER BY s.name;

## Combine alerts and incidents into one timeline
id: timeline
task: For service 7, show one list of events ordered by time: the time and a label, where alerts are labelled 'alert: NAME' and incidents 'incident: CAUSE'. Use fired_at and started_at as the time.
hint: UNION ALL two SELECTs with the same columns, then ORDER BY time.
@@ start
SELECT fired_at, name FROM alerts WHERE service_id = 7;
@@ sol
SELECT t, label FROM (SELECT fired_at AS t, 'alert: ' || name AS label FROM alerts WHERE service_id = 7 UNION ALL SELECT started_at AS t, 'incident: ' || cause AS label FROM incidents WHERE service_id = 7) ORDER BY t, label;

## Services above the average failure share
id: aboveavg
task: Show the names of services whose overall failed share in slo_daily (sum of failed divided by sum of total) is above the share across all rows combined. Order by name.
hint: Compare each service ratio with a scalar subquery of the global ratio.
@@ start
SELECT service_id, SUM(failed), SUM(total) FROM slo_daily GROUP BY service_id;
@@ sol
SELECT s.name FROM slo_daily d JOIN services s ON s.id = d.service_id GROUP BY s.name HAVING SUM(d.failed) * 1.0 / SUM(d.total) > (SELECT SUM(failed) * 1.0 / SUM(total) FROM slo_daily) ORDER BY s.name;

## Services with bad deploys
id: multirollback
task: Show each service name that had at least one deploy with status 'rolled_back' or 'failed', with the count of those deploys. Order by count (highest first) then name.
hint: GROUP BY the service, with status IN ('rolled_back','failed') in WHERE.
@@ start
SELECT name FROM services;
@@ sol
SELECT s.name, COUNT(*) AS bad FROM deploys d JOIN services s ON s.id = d.service_id WHERE d.status IN ('rolled_back', 'failed') GROUP BY s.id ORDER BY bad DESC, s.name;

## Longest incident per team
id: longestteam
task: For each team, show the team and the longest resolved incident in minutes (rounded to whole minutes). Order by minutes descending, then team.
hint: Join incidents to services, filter resolved_at IS NOT NULL, then MAX over the julianday difference.
@@ start
SELECT team FROM services;
@@ sol
SELECT s.team, ROUND(MAX((julianday(i.resolved_at) - julianday(i.started_at)) * 24 * 60)) AS minutes FROM incidents i JOIN services s ON s.id = i.service_id WHERE i.resolved_at IS NOT NULL GROUP BY s.team ORDER BY minutes DESC, s.team;

## Alerts that fired before the incident started
id: alertfirst
task: List alert name and service name where the alert fired within 10 minutes before an incident for the same service started. Order by alert fired time.
hint: Join alerts and incidents on service_id, then compare julianday values.
@@ start
SELECT name FROM alerts;
@@ sol
SELECT a.name, s.name AS service FROM alerts a JOIN incidents i ON i.service_id = a.service_id JOIN services s ON s.id = a.service_id WHERE (julianday(i.started_at) - julianday(a.fired_at)) * 24 * 60 BETWEEN 0 AND 10 ORDER BY a.fired_at, a.id;

## Days with p99 above 800 ms
id: slowdays
task: Show service name, day and p99_ms for every day where p99_ms was above 800. Order by p99_ms descending then day.
hint: Join slo_daily to services and filter p99_ms > 800.
@@ start
SELECT day, p99_ms FROM slo_daily;
@@ sol
SELECT s.name, d.day, d.p99_ms FROM slo_daily d JOIN services s ON s.id = d.service_id WHERE d.p99_ms > 800 ORDER BY d.p99_ms DESC, d.day;

## Share of deploys that succeed per deployer
id: deployersucc
task: For each deployer show the number of deploys and the percentage with status 'ok' rounded to 0 decimals. Order by percentage descending, then deployer.
hint: SUM(status = 'ok') counts successes in SQLite.
@@ start
SELECT deployer FROM deploys;
@@ sol
SELECT deployer, COUNT(*) AS deploys, ROUND(100.0 * SUM(status = 'ok') / COUNT(*)) AS pct_ok FROM deploys GROUP BY deployer ORDER BY pct_ok DESC, deployer;

## Services without any deploy in the last data window
id: nodeploy
task: Which services have no deploy at all after '2026-03-05 00:00:00'? Show their names ordered by name.
hint: NOT EXISTS with a correlated subquery, or LEFT JOIN with a date filter in the ON clause.
@@ start
SELECT name FROM services;
@@ sol
SELECT s.name FROM services s WHERE NOT EXISTS (SELECT 1 FROM deploys d WHERE d.service_id = s.id AND d.deployed_at > '2026-03-05 00:00:00') ORDER BY s.name;

## Rank services by incident count
id: rankinc
task: Show each service name, its incident count and its rank by incident count (1 is highest) using RANK(). Order by rank, then name.
hint: RANK() OVER (ORDER BY COUNT(*) DESC) works together with GROUP BY.
@@ start
SELECT name FROM services;
@@ sol
SELECT s.name, COUNT(i.id) AS incidents, RANK() OVER (ORDER BY COUNT(i.id) DESC) AS rnk FROM services s LEFT JOIN incidents i ON i.service_id = s.id GROUP BY s.id ORDER BY rnk, s.name;

## Running total of failed requests
id: runningfail
task: For service id 1, show day, failed and the running total of failed requests ordered by day.
hint: SUM(failed) OVER (ORDER BY day) is a running total.
@@ start
SELECT day, failed FROM slo_daily WHERE service_id = 1;
@@ sol
SELECT day, failed, SUM(failed) OVER (ORDER BY day) AS running_failed FROM slo_daily WHERE service_id = 1 ORDER BY day;

## Pages that were never acknowledged, by alert name
id: unackname
task: For each alert name, count the paged alerts (paged = 1) that were never acknowledged (acked_at IS NULL). Show only names with at least one, ordered by count descending then name.
hint: WHERE paged = 1 AND acked_at IS NULL, then GROUP BY name.
@@ start
SELECT name FROM alerts;
@@ sol
SELECT name, COUNT(*) AS n FROM alerts WHERE paged = 1 AND acked_at IS NULL GROUP BY name ORDER BY n DESC, name;
