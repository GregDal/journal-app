-- Add freeform and ai_guided entry types
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_entry_type_check;
ALTER TABLE entries ADD CONSTRAINT entries_entry_type_check
  CHECK (entry_type IN ('quick', 'reflection', 'comprehensive', 'cbt', 'freeform', 'ai_guided'));
