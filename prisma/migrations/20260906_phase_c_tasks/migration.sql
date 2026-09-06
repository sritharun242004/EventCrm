-- Phase C — per-event tasks.
CREATE TYPE task_status   AS ENUM ('open', 'in_progress', 'blocked', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE tasks (
  id                   SERIAL PRIMARY KEY,
  event_id             INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT,
  status               task_status  NOT NULL DEFAULT 'open',
  priority             task_priority NOT NULL DEFAULT 'normal',
  assignee_user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_on               DATE,
  completed_at         TIMESTAMPTZ(6),
  created_at           TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX tasks_event_status_idx    ON tasks (event_id, status);
CREATE INDEX tasks_assignee_status_idx ON tasks (assignee_user_id, status);

CREATE TABLE task_checklist_items (
  id       SERIAL PRIMARY KEY,
  task_id  INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  done     BOOLEAN NOT NULL DEFAULT FALSE,
  "order"  INTEGER NOT NULL DEFAULT 0
);
