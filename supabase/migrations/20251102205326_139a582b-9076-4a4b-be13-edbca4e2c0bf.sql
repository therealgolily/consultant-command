-- Create tasks table for Command Center
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox',
  category TEXT,
  priority TEXT DEFAULT 'normal',
  client_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own tasks
CREATE POLICY "Users can manage own tasks" 
ON public.tasks
FOR ALL 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);