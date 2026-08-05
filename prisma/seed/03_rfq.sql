-- Extension: Vendor RFQ (Request for Quotation) workflow
-- Enables: create RFQ → dispatch to vendors → collect quotes → compare → award

BEGIN;

DROP TABLE IF EXISTS rfq_quotes CASCADE;
DROP TABLE IF EXISTS rfq_recipients CASCADE;
DROP TABLE IF EXISTS rfq_items CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TYPE  IF EXISTS rfq_status CASCADE;
DROP TYPE  IF EXISTS quote_status CASCADE;

CREATE TYPE rfq_status   AS ENUM ('draft','sent','collecting','comparing','awarded','cancelled');
CREATE TYPE quote_status AS ENUM ('pending','submitted','declined','shortlisted','awarded');

-- RFQ header
CREATE TABLE rfqs (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category vendor_category NOT NULL,
    status rfq_status NOT NULL DEFAULT 'draft',
    needed_by DATE,
    budget_ceiling_cents BIGINT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    awarded_vendor_id INT REFERENCES vendors(id)
);
CREATE INDEX rfqs_event_idx ON rfqs(event_id);
CREATE INDEX rfqs_status_idx ON rfqs(status);

-- Line items on an RFQ (what is being asked for)
CREATE TABLE rfq_items (
    id SERIAL PRIMARY KEY,
    rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity INT NOT NULL,
    specs TEXT
);

-- Vendors invited to a particular RFQ
CREATE TABLE rfq_recipients (
    id SERIAL PRIMARY KEY,
    rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id INT REFERENCES vendors(id) ON DELETE CASCADE,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(rfq_id, vendor_id)
);

-- Quotes returned by each vendor
CREATE TABLE rfq_quotes (
    id SERIAL PRIMARY KEY,
    rfq_id INT REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id INT REFERENCES vendors(id) ON DELETE CASCADE,
    status quote_status NOT NULL DEFAULT 'pending',
    quoted_cents BIGINT,
    lead_time_days INT,
    validity_days INT DEFAULT 14,
    submitted_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE(rfq_id, vendor_id)
);
CREATE INDEX rfq_quotes_rfq_idx ON rfq_quotes(rfq_id);

COMMIT;

-- =========== SEED ==============
BEGIN;

-- 3 active RFQs across active/upcoming events
INSERT INTO rfqs (code, event_id, title, category, status, needed_by, budget_ceiling_cents, notes, created_by, sent_at, closes_at) VALUES
('RFQ-2026-0031', 9,  'Line-array PA + monitors for 14k',              'sound_av',  'comparing',  '2026-09-20',  48000000,  'Diljit Dosanjh — high-SPL outdoor. Redundancy required.', 'Nikhil B.',  '2026-08-01 10:00+05:30', '2026-08-12 18:00+05:30'),
('RFQ-2026-0032', 10, 'F&B for 2200 across 3 days',                    'catering',  'collecting', '2026-10-01',  42000000,  'Global Meet — jain/veg/non-veg. 42 country delegations.', 'Ayesha K.',  '2026-08-02 12:00+05:30', '2026-08-15 18:00+05:30'),
('RFQ-2026-0033', 12, 'Stage + truss for winter festival',             'stage',     'sent',       '2026-11-25',  48000000,  '5000 pax, two-stage layout, weather cover.',              'Nikhil B.',  '2026-08-04 15:00+05:30', '2026-08-18 18:00+05:30'),
('RFQ-2026-0034', 11, 'Ticketing platform + scanners',                 'ticketing', 'draft',      '2026-10-25',   2500000,  'Youth event — student verification flow needed.',         'Rahul D.',   NULL, NULL);

-- Items for each
INSERT INTO rfq_items (rfq_id, sku, unit, quantity, specs) VALUES
(1,'Line-array PA 20kW',    'day', 1, 'L-Acoustics K2 or equivalent; 4-way delay stack; front-fill'),
(1,'Wireless mic',          'day', 8, 'Shure ULX-D / equivalent; UHF band cleared'),
(1,'Digital mixer 32ch',    'day', 2, 'FOH + monitor'),
(2,'Buffet lunch',          'pax', 2200, 'Day 1 & 2 lunch; 3 cuisine types'),
(2,'Buffet dinner',         'pax', 2200, 'Day 1 & 2 dinner; live counters'),
(2,'Coffee/tea stations',   'pax', 2200, 'All-day, 3 stations'),
(3,'Modular stage 60x30',   'day', 2, 'Weather cover, snow-load rated'),
(3,'Truss span 60ft',       'day', 4, 'Rigging + safety cert'),
(4,'Ticketing platform',    'day', 3, 'API + student ID verification'),
(4,'Gate scanner',          'piece', 4, 'Handheld + kiosk mix');

-- Recipients (who was invited)
INSERT INTO rfq_recipients (rfq_id, vendor_id, responded_at) VALUES
(1,1,'2026-08-03 09:12+05:30'),
(1,2,'2026-08-04 14:44+05:30'),
(1,4,NULL),  -- Skydeck invited but no response yet
(2,9,'2026-08-05 11:03+05:30'),
(2,10,NULL),
(3,3,'2026-08-05 08:22+05:30'),
(3,4,NULL),
(4,12,NULL),
(4,13,NULL);

-- Quotes
INSERT INTO rfq_quotes (rfq_id, vendor_id, status, quoted_cents, lead_time_days, validity_days, submitted_at, notes) VALUES
(1, 1, 'shortlisted', 44500000, 10, 14, '2026-08-03 09:12+05:30', 'K2 rig + spare amps. Includes RF coord.'),
(1, 2, 'submitted',   38500000, 12, 14, '2026-08-04 14:44+05:30', 'V-DOSC alt; 2-day setup.'),
(1, 4, 'pending',     NULL,     NULL, 14, NULL, NULL),
(2, 9, 'submitted',   39800000, 5,  10, '2026-08-05 11:03+05:30', 'Full menu deck attached. Live counters at ₹18k each.'),
(2, 10,'pending',     NULL,     NULL, 10, NULL, NULL),
(3, 3, 'submitted',   47500000, 14, 14, '2026-08-05 08:22+05:30', 'Includes weather cover, snow-load cert.'),
(3, 4, 'pending',     NULL,     NULL, 14, NULL, NULL);

COMMIT;
