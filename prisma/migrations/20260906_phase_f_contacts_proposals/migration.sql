-- Phase F — Contacts + Proposals (shareable link).

CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined', 'superseded');

CREATE TABLE contacts (
  id           SERIAL PRIMARY KEY,
  client_id    INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  title        TEXT,
  email        TEXT,
  phone        TEXT,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  notes        TEXT,
  created_at   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX contacts_client_idx ON contacts (client_id);

ALTER TABLE events
  ADD COLUMN primary_contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

CREATE TABLE proposals (
  id                    SERIAL PRIMARY KEY,
  event_id              INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version               INTEGER NOT NULL DEFAULT 1,
  status                proposal_status NOT NULL DEFAULT 'draft',
  public_token          TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  body_markdown         TEXT NOT NULL,
  amount_cents          BIGINT,
  created_by_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at               TIMESTAMPTZ(6),
  first_viewed_at       TIMESTAMPTZ(6),
  accepted_at           TIMESTAMPTZ(6),
  created_at            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX proposals_event_version_idx ON proposals (event_id, version);
