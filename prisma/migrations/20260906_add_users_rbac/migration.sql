-- Phase A migration — additive only. Safe to apply on the current Neon DB.

-- ==================== ENUM ====================
CREATE TYPE user_role AS ENUM ('ceo', 'sales', 'producer', 'coordinator', 'finance');

-- ==================== USERS ====================
CREATE TABLE users (
  id                    SERIAL PRIMARY KEY,
  email                 TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  password_hash         TEXT,
  role                  user_role NOT NULL,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invited_at            TIMESTAMPTZ(6),
  accepted_at           TIMESTAMPTZ(6),
  last_login_at         TIMESTAMPTZ(6),
  created_at            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX users_role_idx ON users (role);

-- ==================== ACCOUNTS (Auth.js) ====================
CREATE TABLE accounts (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                    TEXT NOT NULL,
  provider                TEXT NOT NULL,
  provider_account_id     TEXT NOT NULL,
  refresh_token           TEXT,
  access_token            TEXT,
  expires_at              INTEGER,
  token_type              TEXT,
  scope                   TEXT,
  id_token                TEXT,
  session_state           TEXT,
  UNIQUE (provider, provider_account_id)
);
CREATE INDEX accounts_user_idx ON accounts (user_id);

-- ==================== VERIFICATION TOKENS (Auth.js) ====================
CREATE TABLE verification_tokens (
  identifier  TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expires     TIMESTAMPTZ(6) NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ==================== EXISTING TABLE PATCHES ====================
ALTER TABLE team_members
  ADD COLUMN user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE events
  ADD COLUMN created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX events_created_by_idx ON events (created_by_user_id);

ALTER TABLE rfqs
  ADD COLUMN created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX rfqs_created_by_user_idx ON rfqs (created_by_user_id);
