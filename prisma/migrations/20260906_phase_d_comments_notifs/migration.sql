-- Phase D — comments, mentions, notifications.

CREATE TYPE comment_entity AS ENUM ('event', 'rfq', 'task');

CREATE TYPE notification_kind AS ENUM (
  'task_assigned',
  'task_due_soon',
  'mentioned',
  'comment_reply',
  'event_assigned',
  'budget_breach',
  'quote_received',
  'rfq_closing'
);

CREATE TABLE comments (
  id                 SERIAL PRIMARY KEY,
  entity_type        comment_entity NOT NULL,
  entity_id          INTEGER NOT NULL CHECK (entity_id > 0),
  author_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body               TEXT NOT NULL,
  created_at         TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  edited_at          TIMESTAMPTZ(6)
);
CREATE INDEX comments_entity_idx ON comments (entity_type, entity_id, created_at);

CREATE TABLE comment_mentions (
  id                  SERIAL PRIMARY KEY,
  comment_id          INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (comment_id, mentioned_user_id)
);

CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        notification_kind NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link_url    TEXT NOT NULL,
  read_at     TIMESTAMPTZ(6),
  created_at  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX notif_user_unread_idx ON notifications (user_id, read_at);
