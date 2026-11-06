CREATE TABLE services (id INTEGER PRIMARY KEY, name TEXT NOT NULL, team TEXT NOT NULL, tier INTEGER NOT NULL);
CREATE TABLE deploys (id INTEGER PRIMARY KEY, service_id INTEGER NOT NULL REFERENCES services(id), version TEXT NOT NULL, deployed_at TEXT NOT NULL, status TEXT NOT NULL, deployer TEXT NOT NULL);
CREATE TABLE incidents (id INTEGER PRIMARY KEY, service_id INTEGER NOT NULL REFERENCES services(id), severity INTEGER NOT NULL, started_at TEXT NOT NULL, resolved_at TEXT, cause TEXT);
CREATE TABLE alerts (id INTEGER PRIMARY KEY, service_id INTEGER NOT NULL REFERENCES services(id), name TEXT NOT NULL, fired_at TEXT NOT NULL, acked_at TEXT, paged INTEGER NOT NULL);
CREATE TABLE slo_daily (service_id INTEGER NOT NULL REFERENCES services(id), day TEXT NOT NULL, total INTEGER NOT NULL, failed INTEGER NOT NULL, p99_ms INTEGER NOT NULL, PRIMARY KEY (service_id, day));

INSERT INTO services VALUES (1,'checkout','payments',1),(2,'search','discovery',2),(3,'auth','identity',1),(4,'catalog','discovery',2),(5,'notifications','messaging',3),(6,'reports','data',3),(7,'gateway','platform',1),(8,'invoices','payments',2);

INSERT INTO deploys VALUES
(1,1,'2.4.0','2026-03-01 09:10:00','ok','ann'),
(2,1,'2.4.1','2026-03-03 14:20:00','rolled_back','bob'),
(3,1,'2.4.2','2026-03-04 10:05:00','ok','ann'),
(4,2,'1.9.0','2026-03-02 11:00:00','ok','cho'),
(5,2,'1.9.1','2026-03-05 16:45:00','ok','cho'),
(6,3,'5.0.0','2026-03-01 08:30:00','ok','dev'),
(7,3,'5.0.1','2026-03-02 17:55:00','failed','dev'),
(8,3,'5.0.2','2026-03-03 09:15:00','ok','dev'),
(9,4,'3.2.0','2026-03-04 13:40:00','ok','eli'),
(10,5,'0.8.0','2026-03-01 15:00:00','ok','fay'),
(11,5,'0.8.1','2026-03-05 12:10:00','rolled_back','fay'),
(12,6,'1.1.0','2026-03-03 20:30:00','ok','gus'),
(13,7,'7.3.0','2026-03-02 10:00:00','ok','ann'),
(14,7,'7.3.1','2026-03-04 22:15:00','failed','bob'),
(15,7,'7.3.2','2026-03-05 09:30:00','ok','bob'),
(16,1,'2.5.0','2026-03-06 10:00:00','ok','ann'),
(17,2,'2.0.0','2026-03-06 15:30:00','rolled_back','cho'),
(18,4,'3.2.1','2026-03-07 11:45:00','ok','eli');

INSERT INTO incidents VALUES
(1,1,1,'2026-03-03 14:35:00','2026-03-03 15:20:00','bad deploy'),
(2,3,2,'2026-03-02 18:00:00','2026-03-02 18:40:00','bad deploy'),
(3,7,1,'2026-03-04 22:30:00','2026-03-05 00:10:00','bad deploy'),
(4,5,3,'2026-03-05 12:20:00','2026-03-05 13:00:00','bad deploy'),
(5,2,2,'2026-03-06 15:45:00','2026-03-06 16:30:00','bad deploy'),
(6,4,3,'2026-03-04 02:00:00','2026-03-04 03:30:00','disk full'),
(7,6,3,'2026-03-05 04:10:00','2026-03-05 04:50:00','disk full'),
(8,1,2,'2026-03-07 08:00:00','2026-03-07 08:25:00','dependency timeout'),
(9,3,1,'2026-03-07 19:10:00','2026-03-07 21:40:00','expired certificate'),
(10,7,2,'2026-03-06 03:15:00','2026-03-06 03:55:00','dependency timeout'),
(11,2,3,'2026-03-02 12:00:00','2026-03-02 12:20:00','traffic spike'),
(12,1,2,'2026-03-07 23:00:00',NULL,'unknown');

INSERT INTO alerts VALUES
(1,1,'HighErrorRate','2026-03-03 14:33:00','2026-03-03 14:36:00',1),
(2,1,'HighLatency','2026-03-03 14:34:00','2026-03-03 14:36:00',1),
(3,3,'HighErrorRate','2026-03-02 17:58:00','2026-03-02 18:05:00',1),
(4,7,'HighErrorRate','2026-03-04 22:28:00','2026-03-04 22:50:00',1),
(5,7,'HighLatency','2026-03-04 22:29:00',NULL,0),
(6,5,'QueueBacklog','2026-03-05 12:18:00','2026-03-05 12:30:00',0),
(7,2,'HighLatency','2026-03-06 15:44:00','2026-03-06 15:47:00',1),
(8,4,'DiskAlmostFull','2026-03-04 01:30:00','2026-03-04 01:55:00',0),
(9,6,'DiskAlmostFull','2026-03-05 03:50:00','2026-03-05 04:20:00',0),
(10,1,'DependencyDown','2026-03-07 07:58:00','2026-03-07 08:01:00',1),
(11,3,'CertExpiring','2026-03-05 09:00:00',NULL,0),
(12,3,'CertExpired','2026-03-07 19:08:00','2026-03-07 19:12:00',1),
(13,7,'DependencyDown','2026-03-06 03:14:00','2026-03-06 03:22:00',1),
(14,2,'HighLatency','2026-03-02 11:58:00',NULL,0),
(15,1,'HighErrorRate','2026-03-07 22:58:00',NULL,1),
(16,5,'QueueBacklog','2026-03-06 10:00:00','2026-03-06 10:05:00',0),
(17,6,'JobFailed','2026-03-06 02:00:00',NULL,0),
(18,4,'HighLatency','2026-03-07 12:00:00','2026-03-07 12:06:00',0);

INSERT INTO slo_daily VALUES
(1,'2026-03-01',100000,40,210),(1,'2026-03-02',110000,55,220),(1,'2026-03-03',120000,900,980),(1,'2026-03-04',105000,60,230),(1,'2026-03-05',98000,35,200),
(2,'2026-03-01',200000,100,150),(2,'2026-03-02',210000,320,310),(2,'2026-03-03',205000,120,160),(2,'2026-03-04',199000,90,140),(2,'2026-03-05',202000,110,155),
(3,'2026-03-01',500000,250,60),(3,'2026-03-02',510000,1500,75),(3,'2026-03-03',495000,230,58),(3,'2026-03-04',505000,260,61),(3,'2026-03-05',498000,240,59),
(7,'2026-03-01',900000,450,45),(7,'2026-03-02',910000,500,47),(7,'2026-03-03',905000,430,44),(7,'2026-03-04',890000,4000,120),(7,'2026-03-05',920000,600,50);
