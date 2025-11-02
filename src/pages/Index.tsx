import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import QuickCaptureForm from "@/components/QuickCaptureForm";
import TaskCard from "@/components/TaskCard";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  created_at: string;
}

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "inbox")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="sticky top-0 bg-background pb-6 pt-2 border-b border-border mb-8 z-10">
        <h2 className="text-2xl font-bold mb-4 lowercase">inbox</h2>
        <QuickCaptureForm onSuccess={fetchTasks} />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground lowercase py-12">
          loading...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center text-muted-foreground lowercase py-12">
          no tasks yet. add one above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
