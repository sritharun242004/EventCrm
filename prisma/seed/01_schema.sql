-- Event Management CRM — Schema
-- Reference app: Eventbot (host: this event mgmt company)
-- Design principles: normalized, audit-friendly, extensible, cents-based money (bigint)

BEGIN;

-- Clean slate (safe for empty DB, no-ops otherwise)
DROP TABLE IF EXISTS event_reviews CASCADE;
DROP TABLE IF EXISTS ticket_sales CASCADE;
DROP TABLE IF EXISTS ticket_tiers CASCADE;
DROP TABLE IF EXISTS budget_lines CASCADE;
DROP TABLE IF EXISTS event_vendors CASCADE;
DROP TABLE IF EXISTS event_assignments CASCADE;
DROP TABLE IF EXISTS sponsors CASCADE;
DROP TABLE IF EXISTS market_intel CASCADE;
DROP TABLE IF EXISTS vendor_offerings CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS venues CASCADE;

-- Enums
DROP TYPE IF EXISTS event_status CASCADE;
CREATE TYPE event_status AS ENUM ('lead','proposed','confirmed','in_production','live','wrap_up','completed','cancelled');
DROP TYPE IF EXISTS event_type CASCADE;
CREATE TYPE event_type AS ENUM ('concert','conference','tech_summit','tedx','private_party','product_launch','wedding','festival','corporate','gala');
DROP TYPE IF EXISTS vendor_category CASCADE;
CREATE TYPE vendor_category AS ENUM ('sound_av','stage','decor','carpet_flooring','lighting','fnb','water','catering','contractor','security','ticketing','photography','videography','transport','printing','logistics');

-- Clients (the people who book events with us)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    industry TEXT,
    lifetime_value_cents BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues where events take place
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    capacity INT,
    day_rate_cents BIGINT,
    contact TEXT,
    notes TEXT
);

-- Teams
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    focus TEXT,      -- e.g. "Concerts & Festivals", "Corporate & Conferences"
    lead_name TEXT,
    headcount INT DEFAULT 0
);

CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,            -- Producer, Coordinator, Stage Mgr, ...
    skill_tags TEXT[],
    utilization_pct INT DEFAULT 0,   -- 0-100
    rating_avg NUMERIC(3,2) DEFAULT 4.5
);

-- Events
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE,            -- e.g. "EVT-2026-0142"
    name TEXT NOT NULL,
    type event_type NOT NULL,
    status event_status NOT NULL DEFAULT 'lead',
    client_id INT REFERENCES clients(id),
    venue_id INT REFERENCES venues(id),
    lead_team_id INT REFERENCES teams(id),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    expected_attendees INT DEFAULT 0,
    confirmed_attendees INT DEFAULT 0,
    projected_revenue_cents BIGINT DEFAULT 0,
    booked_revenue_cents BIGINT DEFAULT 0,
    total_budget_cents BIGINT DEFAULT 0,
    spent_cents BIGINT DEFAULT 0,
    reputation_score NUMERIC(3,2),  -- post-event 0-5
    highlight TEXT,                 -- one-line description
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX events_status_idx ON events(status);
CREATE INDEX events_starts_on_idx ON events(starts_on);

-- Vendors master (mic set, stage, decor, carpet, F&B, water, contractors, ticketing, ...)
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category vendor_category NOT NULL,
    city TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    rating NUMERIC(3,2) DEFAULT 4.5,
    reliability_pct INT DEFAULT 90,   -- on-time delivery %
    preferred BOOLEAN DEFAULT false,
    notes TEXT
);
CREATE INDEX vendors_category_idx ON vendors(category);

-- Vendor pricing per SKU (date-agnostic base + optional seasonal multiplier)
CREATE TABLE vendor_offerings (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES vendors(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,             -- e.g. "Line-array PA 20kW"
    unit TEXT NOT NULL,            -- day / pax / sqft / piece
    base_price_cents BIGINT NOT NULL,
    peak_multiplier NUMERIC(4,2) DEFAULT 1.00,   -- weekend/season markup
    min_order INT DEFAULT 1,
    lead_time_days INT DEFAULT 7
);

-- Vendors booked on a specific event (procurement side)
CREATE TABLE event_vendors (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    vendor_id INT REFERENCES vendors(id),
    offering_sku TEXT,
    quantity INT DEFAULT 1,
    quoted_cents BIGINT NOT NULL,
    booked_cents BIGINT,
    status TEXT DEFAULT 'quoted',     -- quoted / booked / delivered / paid
    UNIQUE(event_id, vendor_id, offering_sku)
);

-- Budgets: category-level breakdown per event
CREATE TABLE budget_lines (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    category TEXT NOT NULL,          -- 'Sound & AV','Stage','Decor','F&B','Water','Contractors','Security','Ticketing','Marketing','Team Cost','Contingency'
    planned_cents BIGINT NOT NULL,
    actual_cents BIGINT DEFAULT 0,
    notes TEXT
);
CREATE INDEX budget_lines_event_idx ON budget_lines(event_id);

-- Ticketing
CREATE TABLE ticket_tiers (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,         -- General / VIP / Sponsor
    price_cents BIGINT NOT NULL,
    inventory INT NOT NULL,
    sold INT DEFAULT 0
);

CREATE TABLE ticket_sales (
    id SERIAL PRIMARY KEY,
    tier_id INT REFERENCES ticket_tiers(id) ON DELETE CASCADE,
    sold_on DATE NOT NULL,
    qty INT NOT NULL,
    revenue_cents BIGINT NOT NULL
);

-- Sponsors (per event)
CREATE TABLE sponsors (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tier TEXT,                -- Title / Gold / Silver / Community
    amount_cents BIGINT NOT NULL,
    status TEXT DEFAULT 'signed'   -- pitched / signed / paid
);

-- Team assignments per event
CREATE TABLE event_assignments (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    member_id INT REFERENCES team_members(id) ON DELETE CASCADE,
    role TEXT,
    UNIQUE(event_id, member_id)
);

-- Reviews / reputation (post-event surveys)
CREATE TABLE event_reviews (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    source TEXT,                -- google, instagram, email survey
    score NUMERIC(3,2) NOT NULL,   -- 0-5
    nps INT,                    -- -100..100 (roll-up)
    quote TEXT,
    author TEXT,
    reviewed_on DATE
);

-- Market intelligence — competitor / scouted events happening in the market
CREATE TABLE market_intel (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    organizer TEXT,
    type event_type,
    city TEXT,
    starts_on DATE,
    expected_attendees INT,
    est_ticket_price_cents BIGINT,
    signal TEXT,             -- 'opportunity' | 'competitor' | 'partner'
    notes TEXT
);

COMMIT;
