-- Seed data — Eventbot Event Management CRM
-- All money in cents (INR paise-style, but currency-agnostic). Reference year: 2026.

BEGIN;

-- ===== Clients =====
INSERT INTO clients (name, company, contact_email, contact_phone, industry, lifetime_value_cents) VALUES
('Priya Menon',   'TEDx Bangalore',          'priya@tedxblr.org',       '+91 98450 11223', 'Media',          185000000),
('Arjun Rao',     'NovaTech Systems',        'arjun@novatech.io',       '+91 98800 34567', 'SaaS',           420000000),
('Ishaan Kapoor', 'Skyline Live',            'ishaan@skylinelive.in',   '+91 97390 55501', 'Music',          760000000),
('Meera Iyer',    'InnovateX Foundation',    'meera@innovatex.org',     '+91 90080 22110', 'Non-profit',     95000000),
('Rohan Shetty',  'Coastal Brew Co.',        'rohan@coastalbrew.co',    '+91 98860 77012', 'F&B',            48000000),
('Aditi Verma',   'Ministry of Tourism',     'aditi.verma@gov.in',      '+91 98181 66009', 'Government',     310000000),
('Sameer Nair',   'Zenith Weddings',         'sameer@zenithwed.com',    '+91 99400 88221', 'Weddings',       220000000),
('Kavita Rao',    'FinPeak Advisors',        'kavita@finpeak.co',       '+91 98410 12345', 'Finance',        135000000);

-- ===== Venues =====
INSERT INTO venues (name, city, capacity, day_rate_cents, contact, notes) VALUES
('Nimbus Arena',           'Bengaluru', 8500, 45000000, '+91 80 4114 2200', 'Covered, 30k sqft, tiered seating'),
('Palace Grounds',         'Bengaluru', 15000, 68000000, '+91 80 4211 6600', 'Open air, permit-heavy'),
('The Leela Ballroom',     'Bengaluru', 900,  22000000, '+91 80 2521 1234', 'Corporate premium'),
('Coastal Amphitheatre',   'Chennai',   3200, 28000000, '+91 44 2841 9900', 'Ocean-facing'),
('KEC Convention Centre',  'Mumbai',    2400, 34000000, '+91 22 6688 4400', 'CBD, easy load-in'),
('Aravalli Fields',        'Gurugram',  12000, 55000000, '+91 124 456 7800', 'Festival grade');

-- ===== Teams =====
INSERT INTO teams (name, focus, lead_name, headcount) VALUES
('Aurora Live',      'Concerts & Festivals',      'Nikhil Bansal', 8),
('Meridian Corp',    'Corporate & Conferences',   'Ayesha Khan',   6),
('Signal Talks',     'TEDx, Summits, Panels',     'Rahul Deshmukh',5),
('Vermillion Ceremonies','Weddings & Private',    'Sneha Pillai',  4),
('Ops Command',      'Operations, permits, safety','Vikram Sethi', 4);

-- ===== Team members =====
INSERT INTO team_members (team_id, name, role, skill_tags, utilization_pct, rating_avg) VALUES
-- Aurora Live
(1,'Nikhil Bansal',   'Head Producer',      ARRAY['production','concerts','budgets'], 92, 4.8),
(1,'Anjali Bhatia',   'Stage Manager',      ARRAY['stage','riders'],                  78, 4.7),
(1,'Karan Malhotra',  'Sound Lead',         ARRAY['audio','line-array'],              85, 4.6),
(1,'Divya Krishnan',  'Coordinator',        ARRAY['logistics'],                       70, 4.5),
(1,'Rehan Ali',       'Lighting Designer',  ARRAY['lighting','moving-head'],          65, 4.9),
-- Meridian Corp
(2,'Ayesha Khan',     'Head of Corporate',  ARRAY['corporate','client-mgmt'],         88, 4.9),
(2,'Vikas Nambiar',   'Producer',           ARRAY['conferences'],                     75, 4.6),
(2,'Radha Sharma',    'AV Coordinator',     ARRAY['av','projection'],                 60, 4.5),
(2,'Farah Mistry',    'Guest Experience',   ARRAY['hospitality'],                     70, 4.7),
-- Signal Talks
(3,'Rahul Deshmukh',  'Curator/Producer',   ARRAY['curation','speakers'],             82, 4.8),
(3,'Naina Roy',       'Speaker Relations',  ARRAY['comms'],                           68, 4.7),
(3,'Aditya Menon',    'Coordinator',        ARRAY['logistics','runsheet'],            72, 4.6),
-- Vermillion
(4,'Sneha Pillai',    'Head Planner',       ARRAY['weddings','decor'],                80, 4.8),
(4,'Manav Grewal',    'Decor Lead',         ARRAY['decor','floral'],                  62, 4.7),
-- Ops
(5,'Vikram Sethi',    'Ops Director',       ARRAY['permits','safety'],                90, 4.9),
(5,'Zoya Ahmed',      'Safety Officer',     ARRAY['safety','crowd'],                  55, 4.8),
(5,'Prithvi Rao',     'Vendor Ops',         ARRAY['procurement'],                     78, 4.6);

-- ===== Vendors =====
INSERT INTO vendors (name, category, city, contact_name, contact_phone, rating, reliability_pct, preferred, notes) VALUES
('SonicWave Audio',       'sound_av',         'Bengaluru', 'Deepak K.',   '+91 98452 10001', 4.8, 96, true,  'Owns L-Acoustics K2 rig'),
('Loud & Clear PA',       'sound_av',         'Chennai',   'Suresh N.',   '+91 98410 20002', 4.5, 89, false, ''),
('Ironframe Rigging',     'stage',            'Bengaluru', 'Vinay P.',    '+91 98862 30003', 4.7, 94, true,  '40x20 quick-assembly deck'),
('Skydeck Structures',    'stage',            'Mumbai',    'Rehana M.',   '+91 99204 40004', 4.6, 91, false, ''),
('Petal & Vine',          'decor',            'Bengaluru', 'Anushka R.',  '+91 90190 50005', 4.9, 97, true,  'Sustainable florals'),
('DreamState Decor',      'decor',            'Delhi',     'Bhaskar S.',  '+91 88820 60006', 4.4, 85, false, ''),
('RedRoll Carpets',       'carpet_flooring',  'Bengaluru', 'Farhan U.',   '+91 98455 70007', 4.5, 92, true,  'Fire-rated, per-sqft'),
('LumenPro Lighting',     'lighting',         'Bengaluru', 'Meher T.',    '+91 97404 80008', 4.7, 93, true,  'Moving head + intelligent'),
('Sattva Kitchens',       'catering',         'Bengaluru', 'Chef Raghav', '+91 98800 90009', 4.8, 95, true,  'Veg / non-veg / jain'),
('BiteBox Corporate',     'catering',         'Mumbai',    'Neel M.',     '+91 98204 10010', 4.5, 88, false, ''),
('AquaSprings',           'water',            'Bengaluru', 'Sridhar V.',  '+91 98456 11011', 4.6, 96, true,  '20L + bottled + stations'),
('LiveDesk Ticketing',    'ticketing',        'Bengaluru', 'Priya B.',    '+91 90080 12012', 4.7, 98, true,  'API, gate-scan'),
('BookMyPass',            'ticketing',        'Mumbai',    'Sameer G.',   '+91 98202 13013', 4.4, 90, false, ''),
('SafeSquare Security',   'security',         'Bengaluru', 'Col. Iyer',   '+91 98862 14014', 4.8, 97, true,  'Trained bouncer teams'),
('Prism Photo Studio',    'photography',      'Bengaluru', 'Zoya S.',     '+91 98454 15015', 4.7, 94, true,  ''),
('Reelframe Video',       'videography',      'Bengaluru', 'Karan A.',    '+91 90000 16016', 4.6, 92, false, ''),
('MoveIt Logistics',      'transport',        'Bengaluru', 'Sunil K.',    '+91 98867 17017', 4.5, 91, false, 'Truck fleet + tempo'),
('PrintPress Signs',      'printing',         'Bengaluru', 'Ganesh N.',   '+91 90020 18018', 4.5, 89, false, 'Banners, standees'),
('BuildRight Contractors','contractor',       'Bengaluru', 'Mohan L.',    '+91 98455 19019', 4.6, 92, true,  'Prefab, pipe-drape, truss'),
('CleanCrew Services',    'contractor',       'Bengaluru', 'Divya P.',    '+91 90070 20020', 4.4, 90, false, 'Pre & post cleaning');

-- ===== Vendor offerings (pricing catalog) =====
INSERT INTO vendor_offerings (vendor_id, sku, unit, base_price_cents, peak_multiplier, min_order, lead_time_days) VALUES
(1,'Line-array PA 20kW',       'day', 18500000, 1.30, 1, 10),
(1,'Wireless mic (Shure)',     'day',   150000, 1.20, 4, 3),
(1,'Digital mixer 32ch',       'day',  1200000, 1.20, 1, 5),
(2,'Line-array PA 15kW',       'day', 12500000, 1.25, 1, 7),
(3,'Modular stage 40x20',      'day', 22000000, 1.30, 1, 14),
(3,'Truss span 40ft',          'day',  3500000, 1.20, 1, 7),
(4,'Custom stage build',       'day', 32000000, 1.35, 1, 14),
(5,'Floral centrepieces',      'piece', 250000, 1.15, 10, 5),
(5,'Backdrop install',         'day',  4500000, 1.20, 1, 7),
(6,'Themed set (regal)',       'day', 12000000, 1.30, 1, 10),
(7,'Red carpet run',           'sqft',    3200, 1.10, 200, 3),
(7,'Event floor cover',        'sqft',    1800, 1.10, 500, 3),
(8,'Moving head fixtures x24', 'day',  5800000, 1.25, 1, 7),
(9,'Buffet dinner (veg)',      'pax',    120000, 1.15, 100, 5),
(9,'Cocktail hour finger food','pax',     85000, 1.15, 100, 3),
(10,'Corporate lunch box',     'pax',     55000, 1.10, 100, 3),
(11,'20L water dispensers',    'piece',  120000, 1.10, 5, 2),
(11,'500ml bottled water',     'piece',    2500, 1.10, 500, 2),
(12,'Ticketing platform (SaaS)','day',  1500000, 1.00, 1, 1),
(12,'Gate scanner rental',     'piece',  150000, 1.10, 2, 3),
(13,'Ticketing platform (SaaS)','day', 1800000, 1.00, 1, 1),
(14,'Bouncer 12-hour',         'pax',    280000, 1.20, 8, 3),
(15,'Photo team (2 shooters)', 'day',   4500000, 1.15, 1, 5),
(16,'Video team + edit',       'day',   6500000, 1.15, 1, 7),
(17,'32ft truck',              'day',   1800000, 1.10, 1, 2),
(18,'12x8 backdrop print',     'piece',  350000, 1.10, 1, 3),
(19,'Prefab back-of-house',    'day',   4200000, 1.20, 1, 5),
(19,'Pipe and drape 100ft',    'day',   1200000, 1.15, 1, 3),
(20,'Post-event deep clean',   'day',   1500000, 1.10, 1, 1);

-- ===== Events =====
-- Mix of statuses across 2026: some completed (Jan-Jul), live/production (Aug), confirmed upcoming (Sep-Dec), leads.
INSERT INTO events (code, name, type, status, client_id, venue_id, lead_team_id,
   starts_on, ends_on, expected_attendees, confirmed_attendees,
   projected_revenue_cents, booked_revenue_cents, total_budget_cents, spent_cents, reputation_score, highlight) VALUES
('EVT-2026-0101','Skyline Live: Arijit Singh Tour','concert','completed', 3,2,1,
    '2026-02-14','2026-02-14', 12000, 11640,
    480000000,472000000,320000000,309500000, 4.8, 'Sold out in 6 days — highest per-cap revenue of Q1.'),
('EVT-2026-0102','TEDx Bangalore 2026','tedx','completed', 1,3,3,
    '2026-03-22','2026-03-22', 850, 812,
    75000000, 72500000, 52000000, 49200000, 4.9, 'Full sponsor recovery + 12 international speakers.'),
('EVT-2026-0103','NovaTech DevSummit','tech_summit','completed', 2,5,2,
    '2026-04-18','2026-04-19', 1800, 1720,
    140000000,138000000,105000000, 99000000, 4.7, 'Two-day dev conf, 42 sponsors, 96% CSAT.'),
('EVT-2026-0104','InnovateX Impact Awards','gala','completed', 4,3,2,
    '2026-05-30','2026-05-30', 700, 680,
    58000000, 56000000, 42000000, 41200000, 4.6, 'Awards + gala; livestreamed to 40k.'),
('EVT-2026-0105','Zenith: Kapoor–Menon Wedding','wedding','completed', 7,6,4,
    '2026-06-12','2026-06-14', 1200, 1180,
    220000000,220000000,180000000,176500000, 4.9, '3-day wedding; celebrity guest list.'),
('EVT-2026-0106','Coastal Brew Festival','festival','completed', 5,4,1,
    '2026-07-19','2026-07-20', 4500, 4310,
    165000000,162000000,120000000,116800000, 4.5, 'Beach festival, 24 craft brews, 8 acts.'),

('EVT-2026-0107','FinPeak Wealth Summit','conference','live', 8,3,2,
    '2026-08-05','2026-08-06', 900, 872,
    98000000, 96000000, 66000000, 58400000, NULL, 'CFO summit, closing keynote Wed.'),
('EVT-2026-0108','NovaTech AI Studio Launch','product_launch','in_production', 2,3,2,
    '2026-08-22','2026-08-22', 600, 540,
    72000000, 68000000, 48000000, 22400000, NULL, 'Product launch + hands-on lab. Load-in Aug 20.'),

('EVT-2026-0109','Skyline Live: Diljit Dosanjh','concert','confirmed', 3,2,1,
    '2026-09-27','2026-09-27', 14000, 8400,
    560000000,340000000,380000000, 42000000, NULL, 'Advance tickets 60% sold in first week.'),
('EVT-2026-0110','Ministry of Tourism Global Meet','conference','confirmed', 6,5,2,
    '2026-10-14','2026-10-16', 2200, 1900,
    186000000,165000000,132000000,  8400000, NULL, '3-day, 42 country delegations.'),
('EVT-2026-0111','TEDx Youth 2026','tedx','confirmed', 1,3,3,
    '2026-11-08','2026-11-08', 500, 220,
    45000000, 21500000, 32000000,  4500000, NULL, 'Youth speakers, 6 mentored curators.'),
('EVT-2026-0112','Coastal Brew Winter Fest','festival','confirmed', 5,4,1,
    '2026-12-13','2026-12-14', 5000, 1350,
    175000000, 62000000,128000000,  6800000, NULL, 'Winter edition, food+brews+music.'),

('EVT-2026-0113','Zenith: Rao–Iyer Wedding','wedding','proposed', 7,6,4,
    '2027-01-10','2027-01-12', 900, 0,
    170000000, 0, 140000000, 0, NULL, 'Proposal out; awaiting sign-off.'),
('EVT-2026-0114','NovaTech APAC Kickoff','corporate','proposed', 2,5,2,
    '2027-02-05','2027-02-05', 400, 0,
    52000000, 0, 36000000, 0, NULL, 'APAC leaders meet; likely close.'),
('EVT-2026-0115','FinPeak Family Office Retreat','private_party','lead', 8,3,2,
    '2027-03-14','2027-03-15', 120, 0,
    28000000, 0, 22000000, 0, NULL, 'Discovery call scheduled.');

-- ===== Budget lines (illustrative, focused on active + upcoming) =====
-- Standard 11-category shape per event
INSERT INTO budget_lines (event_id, category, planned_cents, actual_cents) VALUES
-- EVT-0107 FinPeak Wealth Summit (live)
(7,'Sound & AV',      8000000,  7800000),
(7,'Stage',           4500000,  4200000),
(7,'Decor',           5500000,  4900000),
(7,'F&B',            18000000, 16200000),
(7,'Water',            600000,   540000),
(7,'Contractors',     4200000,  3600000),
(7,'Security',        2200000,  2000000),
(7,'Ticketing',       1200000,  1200000),
(7,'Marketing',       7500000,  7100000),
(7,'Team Cost',       9500000,  8200000),
(7,'Contingency',     4800000,  2660000),
-- EVT-0108 NovaTech AI Studio Launch (in_production)
(8,'Sound & AV',      5200000,  1800000),
(8,'Stage',           6500000,  3500000),
(8,'Decor',           4800000,  2200000),
(8,'F&B',            10500000,  4600000),
(8,'Water',            450000,   200000),
(8,'Contractors',     3500000,  2000000),
(8,'Security',        1600000,   800000),
(8,'Ticketing',        800000,   600000),
(8,'Marketing',       6000000,  3400000),
(8,'Team Cost',       6200000,  3100000),
(8,'Contingency',     2450000,   200000),
-- EVT-0109 Diljit Dosanjh (confirmed)
(9,'Sound & AV',     42000000,  6500000),
(9,'Stage',          38000000,  5200000),
(9,'Decor',          14000000,   800000),
(9,'F&B',            32000000,  4200000),
(9,'Water',           1500000,   400000),
(9,'Contractors',    22000000,  3800000),
(9,'Security',       28000000,  5200000),
(9,'Ticketing',      12000000,  4000000),
(9,'Marketing',      68000000, 12500000),
(9,'Team Cost',      42000000,  0),
(9,'Contingency',    80500000,   0),
-- EVT-0110 Ministry Global Meet (confirmed)
(10,'Sound & AV',    14000000,  1200000),
(10,'Stage',         12000000,   800000),
(10,'Decor',         11000000,   400000),
(10,'F&B',           38000000,  1800000),
(10,'Water',          1200000,   300000),
(10,'Contractors',    9500000,  1200000),
(10,'Security',       8200000,   400000),
(10,'Ticketing',      2200000,   400000),
(10,'Marketing',      9500000,  1200000),
(10,'Team Cost',     18000000,   400000),
(10,'Contingency',    8400000,   300000);

-- ===== Ticket tiers =====
INSERT INTO ticket_tiers (event_id, tier_name, price_cents, inventory, sold) VALUES
(9,'General',   250000, 10000, 6100),
(9,'Premium',   450000,  3000, 1900),
(9,'VIP Box', 1200000,  1000,  400),
(11,'General',  60000,   400,   180),
(11,'Student',  30000,   100,    40),
(12,'General', 180000,  4000,  1200),
(12,'VIP',     450000,  1000,   150);

-- ===== Sponsors =====
INSERT INTO sponsors (event_id, name, tier, amount_cents, status) VALUES
(3,'AWS','Title',       35000000,'paid'),
(3,'GitHub','Gold',     18000000,'paid'),
(3,'Datadog','Silver',   9000000,'paid'),
(2,'Infosys','Title',   22000000,'paid'),
(2,'Zerodha','Gold',    12000000,'paid'),
(10,'Air India','Title', 45000000,'signed'),
(10,'Taj Group','Gold',  25000000,'signed'),
(10,'Google APAC','Gold',22000000,'signed'),
(12,'Kingfisher','Title',28000000,'signed'),
(12,'Sula Vineyards','Gold',12000000,'signed');

-- ===== Assignments (representative) =====
INSERT INTO event_assignments (event_id, member_id, role) VALUES
(7,6,'Producer'),(7,7,'Coord'),(7,15,'Ops'),
(8,6,'Producer'),(8,8,'AV Lead'),(8,17,'Vendor Ops'),
(9,1,'Head Producer'),(9,2,'Stage Mgr'),(9,3,'Sound Lead'),(9,5,'Lighting'),(9,16,'Safety'),
(10,6,'Producer'),(10,7,'Coord'),(10,9,'Guest Exp'),(10,15,'Ops Director'),
(11,10,'Producer'),(11,11,'Speaker Rel'),(11,12,'Coord'),
(12,1,'Head Producer'),(12,4,'Coord'),(12,17,'Vendor Ops');

-- ===== Reviews / reputation =====
INSERT INTO event_reviews (event_id, source, score, nps, quote, author, reviewed_on) VALUES
(1,'google',      4.8, 74, 'Best-produced Arijit concert of the year in the city.',   'Rakesh V.', '2026-02-16'),
(1,'instagram',   4.9, 82, 'Sound was crystal, crowd management was flawless.',       'Neha S.',   '2026-02-15'),
(2,'email',       4.9, 84, 'World-class curation and stagecraft.',                    'S. Kumar',  '2026-03-24'),
(2,'google',      4.8, 79, 'Better than any TEDx I have attended abroad.',            'M. Iyer',   '2026-03-25'),
(3,'email',       4.7, 71, 'Genuinely useful conference, well-run tracks.',           'A. Verma',  '2026-04-21'),
(4,'linkedin',    4.6, 66, 'A beautifully produced awards evening.',                  'K. Menon',  '2026-06-01'),
(5,'google',      4.9, 88, 'Every detail thought through, flawless three days.',      'Family',    '2026-06-16'),
(6,'instagram',   4.5, 62, 'Chill vibes, beer flowed, good bands.',                   'D. Rao',    '2026-07-21');

-- ===== Market intel (competitor / opportunity scan) =====
INSERT INTO market_intel (name, organizer, type, city, starts_on, expected_attendees, est_ticket_price_cents, signal, notes) VALUES
('Global SaaS India',       'IndieHackers Asia',      'tech_summit', 'Bengaluru','2026-09-04', 3000, 850000, 'competitor','Overlaps with our Dev tracks'),
('India Live Music Awards', 'Music Circle',           'gala',        'Mumbai',   '2026-10-02', 1200,1200000, 'partner',   'Possible co-production pitch'),
('South Wedding Week',      'Bridal Bureau',          'wedding',     'Chennai',  '2026-11-15', 5000, 500000, 'opportunity','Vendor scouting worth doing'),
('Startup Grand Slam',      'YourStory',              'conference',  'Bengaluru','2026-12-06', 8000, 400000, 'competitor','Same weekend as our Winter Fest'),
('Bharat Cultural Festival','Ministry of Culture',    'festival',    'Delhi',    '2027-01-26', 20000,       0, 'opportunity','RFP window Sep 2026'),
('CFO Roundtable APAC',     'Peer100',                'conference',  'Singapore','2026-11-20',  400,3200000, 'partner',   'FinPeak likely referral');

COMMIT;
