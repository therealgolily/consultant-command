import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from "@dnd-kit/core";
import DraggableTaskCard from "@/components/DraggableTaskCard";
import Bucket from "@/components/Bucket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import RecurringTaskModal from "@/components/recurring/RecurringTaskModal";
import RecurringTasksList from "@/components/recurring/RecurringTasksList";
import QuickCaptureModal from "@/components/QuickCaptureModal";
import { runRecurringTaskEngine } from "@/utils/recurringTaskEngine";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
}

const BUCKETS = [
  { id: "today", label: "today" },
  { id: "tomorrow", label: "tomorrow" },
  { id: "this_week", label: "this week" },
  { id: "next_week", label: "next week" },
  { id: "backburner", label: "backburner" },
];

const Planning = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringExpanded, setRecurringExpanded] = useState(true);
  const [showQuickCapture, setShowQuickCapture] = useState(false);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .in("status", ["inbox", "today", "tomorrow", "this_week", "next_week", "backburner"])
        .eq("is_recurring", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecurringTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          clients (name)
        `)
        .eq("is_recurring", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecurringTasks(data || []);
    } catch (error) {
      console.error("Error fetching recurring tasks:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchRecurringTasks();

    // Auto-run recurring task engine on mount
    const runEngineOnMount = async () => {
      const instancesCreated = await runRecurringTaskEngine();
      if (instancesCreated > 0) {
        toast.success(`created ${instancesCreated} recurring ${instancesCreated === 1 ? "task" : "tasks"}`);
        fetchTasks();
      }
    };
    runEngineOnMount();

    const channel = supabase
      .channel("planning-tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          fetchTasks();
          fetchRecurringTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("task moved");
    } catch (error: any) {
      toast.error(error.message);
      fetchTasks(); // Revert on error
    }
  };

  const inboxTasks = tasks.filter((t) => t.status === "inbox");

  const getTasksForBucket = (bucketId: string) => {
    return tasks.filter((t) => t.status === bucketId);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center text-muted-foreground lowercase py-12">
          loading...
        </div>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Recurring Tasks Section */}
        <Collapsible
          open={recurringExpanded}
          onOpenChange={setRecurringExpanded}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <CollapsibleTrigger className="flex items-center gap-2">
              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  recurringExpanded ? "" : "-rotate-90"
                }`}
              />
              <h2 className="text-2xl font-bold lowercase text-category-idea">
                recurring tasks
              </h2>
              <Badge variant="secondary" className="lowercase">
                {recurringTasks.length}
              </Badge>
            </CollapsibleTrigger>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  const instancesCreated = await runRecurringTaskEngine();
                  if (instancesCreated > 0) {
                    toast.success(`created ${instancesCreated} recurring ${instancesCreated === 1 ? "task" : "tasks"}`);
                    fetchTasks();
                  } else {
                    toast.info("no new instances needed");
                  }
                }}
                size="sm"
                variant="outline"
                className="lowercase"
              >
                generate instances
              </Button>
              <Button
                onClick={() => setShowRecurringModal(true)}
                size="sm"
                className="lowercase bg-category-idea hover:bg-category-idea/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                set up recurring task
              </Button>
            </div>
          </div>

          <CollapsibleContent>
            {recurringTasks.length === 0 ? (
              <div className="text-center text-muted-foreground lowercase py-8 border rounded-lg">
                no recurring tasks yet. automate repetitive work by setting one up.
              </div>
            ) : (
              <RecurringTasksList tasks={recurringTasks} onUpdate={fetchRecurringTasks} />
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="grid grid-cols-5 gap-6">
          {/* Left Column - Inbox */}
          <div className="col-span-2">
            <div className="sticky top-0 bg-background pb-4 pt-2 border-b border-border mb-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold lowercase">inbox</h2>
                  <Badge variant="secondary" className="lowercase">
                    {inboxTasks.length}
                  </Badge>
                </div>
                <Button
                  onClick={() => setShowQuickCapture(true)}
                  size="sm"
                  className="lowercase"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  new task
                </Button>
              </div>
            </div>

            <Bucket id="inbox" tasks={inboxTasks} onUpdate={fetchTasks} />
          </div>

          {/* Right Column - Buckets */}
          <div className="col-span-3 space-y-4">
            {BUCKETS.map((bucket) => (
              <div key={bucket.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold lowercase">
                    {bucket.label}
                  </h3>
                  <Badge variant="outline" className="lowercase">
                    {getTasksForBucket(bucket.id).length}
                  </Badge>
                </div>
                <Bucket
                  id={bucket.id}
                  tasks={getTasksForBucket(bucket.id)}
                  onUpdate={fetchTasks}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-80">
            <DraggableTaskCard
              task={activeTask}
              onUpdate={fetchTasks}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>

      <RecurringTaskModal
        open={showRecurringModal}
        onOpenChange={setShowRecurringModal}
        onSuccess={fetchRecurringTasks}
      />

      <QuickCaptureModal
        open={showQuickCapture}
        onOpenChange={setShowQuickCapture}
      />
    </DndContext>
  );
};

export default Planning;
