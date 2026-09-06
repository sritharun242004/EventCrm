-- Phase G — task playbooks (auto-tasks on status change).

CREATE TYPE playbook_trigger AS ENUM ('manual', 'event_confirmed', 'event_in_production');

CREATE TABLE task_playbooks (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  trigger      playbook_trigger NOT NULL DEFAULT 'manual',
  event_type   event_type,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE task_playbook_items (
  id                       SERIAL PRIMARY KEY,
  playbook_id              INTEGER NOT NULL REFERENCES task_playbooks(id) ON DELETE CASCADE,
  title                    TEXT NOT NULL,
  description              TEXT,
  priority                 task_priority NOT NULL DEFAULT 'normal',
  default_assignee_role    user_role,
  offset_days_from_event   INTEGER NOT NULL,
  order_idx                INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX playbook_item_order_idx ON task_playbook_items (playbook_id, order_idx);

CREATE TABLE event_playbook_runs (
  id           SERIAL PRIMARY KEY,
  event_id     INTEGER NOT NULL REFERENCES events(id)         ON DELETE CASCADE,
  playbook_id  INTEGER NOT NULL REFERENCES task_playbooks(id) ON DELETE CASCADE,
  ran_at       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, playbook_id)
);
