-- Daily TODO list for the /admin/today page.
-- Patrick types things in, marks them done, list persists across days
-- with auto-collapse of stale completed items.

CREATE TABLE IF NOT EXISTS daily_todos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content       text NOT NULL,
  priority      smallint NOT NULL DEFAULT 0, -- 0=normal, 1=high, -1=low
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  -- Optional context tag so we can filter (e.g. "license", "pilot", "personal")
  context       text
);

CREATE INDEX IF NOT EXISTS idx_daily_todos_active
  ON daily_todos (completed_at NULLS FIRST, priority DESC, created_at DESC);
