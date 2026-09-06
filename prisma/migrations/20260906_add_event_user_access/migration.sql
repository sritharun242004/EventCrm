-- Phase B — per-event access grants (hybrid visibility override).

CREATE TABLE event_user_access (
  id                    SERIAL PRIMARY KEY,
  event_id              INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id               INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  granted_by_user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  granted_at            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX event_access_user_idx ON event_user_access (user_id);
