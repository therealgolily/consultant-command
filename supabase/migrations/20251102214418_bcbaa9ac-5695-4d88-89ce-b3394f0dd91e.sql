-- Add due_date column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add index for better query performance on calendar views
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Add comment to document the column
COMMENT ON COLUMN tasks.due_date IS 'Date when task is scheduled on calendar. NULL for inbox tasks.';