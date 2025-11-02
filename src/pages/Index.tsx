import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import QuickCaptureForm from "@/components/QuickCaptureForm";
import CompletableTaskCard from "@/components/CompletableTaskCard";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
}

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tomorrowExpanded, setTomorrowExpanded] = useState(() => {
    const saved = localStorage.getItem("tomorrowExpanded");
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .in("status", ["today", "tomorrow", "this_week", "next_week", "inbox"])
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
      .channel("today-tasks-changes")
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

  const toggleTomorrow = () => {
    const newState = !tomorrowExpanded;
    setTomorrowExpanded(newState);
    localStorage.setItem("tomorrowExpanded", JSON.stringify(newState));
  };

  // Filter tasks
  const urgentTasks = tasks
    .filter((t) => t.priority === "urgent" && ["today", "tomorrow", "this_week"].includes(t.status))
    .sort((a, b) => {
      const statusOrder = { today: 0, tomorrow: 1, this_week: 2 };
      return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
    });
  
  const todayTasks = tasks.filter((t) => t.status === "today");
  const tomorrowTasks = tasks.filter((t) => t.status === "tomorrow");
  const inboxCount = tasks.filter((t) => t.status === "inbox").length;

  const hasAnyTasks = todayTasks.length > 0 || tomorrowTasks.length > 0 || urgentTasks.length > 0;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="text-center text-muted-foreground lowercase py-12">
          loading...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Quick Capture */}
      <div className="sticky top-0 bg-background pb-6 pt-2 border-b border-border mb-8 z-10">
        <h2 className="text-2xl font-bold mb-4 lowercase">today</h2>
        <QuickCaptureForm onSuccess={fetchTasks} />
      </div>

      {!hasAnyTasks && inboxCount === 0 ? (
        <div className="text-center text-muted-foreground lowercase py-12">
          <p className="mb-2">looks like you're all caught up.</p>
          <p className="text-sm">check your inbox or start planning.</p>
        </div>
      ) : !hasAnyTasks && inboxCount > 0 ? (
        <div className="text-center text-muted-foreground lowercase py-12">
          <p className="mb-4">no tasks scheduled for today.</p>
          <Button variant="outline" onClick={() => navigate("/planning")}>
            you have {inboxCount} {inboxCount === 1 ? "item" : "items"} in your inbox
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Urgent Section */}
          {urgentTasks.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-destructive">
                <h3 className="text-lg font-semibold lowercase text-destructive">
                  urgent
                </h3>
                <Badge variant="destructive" className="lowercase">
                  {urgentTasks.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {urgentTasks.map((task) => (
                  <CompletableTaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                ))}
              </div>
            </section>
          )}

          {/* Today Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold lowercase">today</h3>
              <Badge variant="secondary" className="lowercase">
                {todayTasks.length}
              </Badge>
            </div>
            {todayTasks.length === 0 ? (
              <div className="text-center text-muted-foreground lowercase py-8 text-sm">
                nothing scheduled for today
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <CompletableTaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                ))}
              </div>
            )}
          </section>

          {/* Tomorrow Section (Collapsible) */}
          <section>
            <button
              onClick={toggleTomorrow}
              className="flex items-center gap-2 mb-4 w-full hover:opacity-70 transition-opacity"
            >
              {tomorrowExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <h3 className="text-lg font-semibold lowercase">tomorrow</h3>
              <Badge variant="outline" className="lowercase">
                {tomorrowTasks.length}
              </Badge>
            </button>
            {tomorrowExpanded && (
              <>
                {tomorrowTasks.length === 0 ? (
                  <div className="text-center text-muted-foreground lowercase py-8 text-sm">
                    nothing scheduled for tomorrow
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tomorrowTasks.map((task) => (
                      <CompletableTaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Index;
