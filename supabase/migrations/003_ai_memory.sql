-- AI memory: rolling summaries of user's journaling history
CREATE TABLE IF NOT EXISTS ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  summary text NOT NULL DEFAULT '',
  entry_count int NOT NULL DEFAULT 0,
  last_entry_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own memory" ON ai_memory
  FOR ALL USING (auth.uid() = user_id);

-- Long-term themes tracked across entries
CREATE TABLE IF NOT EXISTS ai_long_term_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  theme text NOT NULL,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  frequency int NOT NULL DEFAULT 1,
  notes text
);

ALTER TABLE ai_long_term_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own themes" ON ai_long_term_themes
  FOR ALL USING (auth.uid() = user_id);
