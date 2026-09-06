-- Phase E — audit trail.
CREATE TABLE activity_log (
  id             SERIAL PRIMARY KEY,
  actor_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      INTEGER NOT NULL,
  diff           JSONB,
  created_at     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX activity_entity_idx ON activity_log (entity_type, entity_id, created_at);
CREATE INDEX activity_actor_idx  ON activity_log (actor_user_id, created_at);
