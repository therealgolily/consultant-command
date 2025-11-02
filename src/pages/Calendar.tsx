import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, isSameDay, isToday, isPast } from "date-fns";
import DraggableTaskCard from "@/components/DraggableTaskCard";
import DroppableDay from "@/components/DroppableDay";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import QuickCaptureModal from "@/components/QuickCaptureModal";
import { runRecurringTaskEngine } from "@/utils/recurringTaskEngine";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  due_date?: string | null;
  time_block_start: string | null;
  time_block_end: string | null;
  client_id: string | null;
  parent_task_id: string | null;
  created_at: string;
  clients?: { name: string };
}

const Calendar = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inboxTasks, setInboxTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [inboxExpanded, setInboxExpanded] = useState(true);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          clients (name)
        `)
        .neq("status", "done")
        .eq("is_recurring", false)
        .order("time_block_start", { ascending: true });

      if (error) throw error;
      
      const tasksData = (data || []) as Task[];
      setInboxTasks(tasksData.filter(t => t.status === "inbox"));
      setTasks(tasksData.filter(t => t.status !== "inbox"));
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

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
      .channel("calendar-tasks-changes")
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

  const handleDragStart = (event: DragStartEvent) => {
    const task = [...tasks, ...inboxTasks].find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const dropTargetId = over.id as string;

    console.log("Drop event:", { taskId, dropTargetId });

    // Find the task being dropped
    const sourceTask = [...tasks, ...inboxTasks].find(t => t.id === taskId);
    if (!sourceTask) {
      console.error("Task not found:", taskId);
      toast.error("task not found");
      return;
    }

    console.log("Source task:", sourceTask);

    // Handle drop to inbox - unschedule task
    if (dropTargetId === "inbox") {
      console.log("Dropping to inbox - unscheduling task");

      // Optimistic update
      const updated = { 
        ...sourceTask, 
        due_date: null, 
        status: "inbox" 
      };

      setInboxTasks(prev => [...prev, updated]);
      setTasks(prev => prev.filter(t => t.id !== taskId));

      try {
        const { error } = await supabase
          .from("tasks")
          .update({ 
            due_date: null,
            status: "inbox"
          })
          .eq("id", taskId);

        if (error) throw error;
        
        toast.success("task moved to inbox");
      } catch (error: any) {
        console.error("Failed to unschedule task:", error);
        toast.error(`failed to unschedule: ${error.message}`);
        fetchTasks(); // Revert on error
      }
      return;
    }

    // Handle drop to calendar day
    const dateString = dropTargetId;

    // Parse the date from the droppable id (it's an ISO string)
    let targetDate: Date;
    try {
      targetDate = new Date(dateString);
      if (isNaN(targetDate.getTime())) {
        console.error("Invalid date:", dateString);
        toast.error("invalid date");
        return;
      }
    } catch (err) {
      console.error("Date parsing error:", err);
      toast.error("failed to parse date");
      return;
    }
    
    if (isPast(targetDate) && !isToday(targetDate)) {
      toast.error("cannot schedule tasks on past dates");
      return;
    }

    // Determine status based on date
    let newStatus = "this_week";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = addDays(today, 1);
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
    
    targetDate.setHours(0, 0, 0, 0);
    
    if (isSameDay(targetDate, today)) {
      newStatus = "today";
    } else if (isSameDay(targetDate, tomorrow)) {
      newStatus = "tomorrow";
    } else if (targetDate > weekEnd) {
      newStatus = "next_week";
    }

    console.log("Calculated status:", newStatus, "for date:", targetDate);

    // Format date for database (YYYY-MM-DD)
    const formattedDate = format(targetDate, "yyyy-MM-dd");
    console.log("Formatted date for DB:", formattedDate);

    // Optimistic update
    const updated = { 
      ...sourceTask, 
      due_date: formattedDate, 
      status: newStatus 
    };

    setTasks(prev => {
      const filtered = prev.filter(t => t.id !== taskId);
      return [...filtered, updated];
    });
    setInboxTasks(prev => prev.filter(t => t.id !== taskId));

    // Update database
    try {
      console.log("Updating task in DB:", { taskId, due_date: formattedDate, status: newStatus });
      
      const { data, error } = await supabase
        .from("tasks")
        .update({ 
          due_date: formattedDate,
          status: newStatus
        })
        .eq("id", taskId)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      console.log("Update successful:", data);
      toast.success(`task scheduled for ${format(targetDate, "MMM d")}`);
    } catch (error: any) {
      console.error("Failed to update task:", error);
      toast.error(`failed to schedule: ${error.message}`);
      fetchTasks(); // Revert on error
    }
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day));
  };

  const formatTimeBlock = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const startTime = format(new Date(start), "h:mm a");
    const endTime = format(new Date(end), "h:mm a");
    return `${startTime} - ${endTime}`;
  };

  const openQuickCapture = (date: Date) => {
    setSelectedDate(date);
    setQuickCaptureOpen(true);
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
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        {/* Inbox Sidebar */}
        <div className={`border-r border-border bg-sidebar transition-all duration-300 ${inboxExpanded ? "w-72" : "w-0"}`}>
          {inboxExpanded && (
            <DroppableDay
              id="inbox"
              isToday={false}
              isPast={false}
            >
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold lowercase">inbox</h3>
                  <Badge variant="secondary" className="lowercase">{inboxTasks.length}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3 lowercase">
                  drag tasks here to unschedule
                </div>
                <Button
                  onClick={() => {
                    setSelectedDate(null);
                    setQuickCaptureOpen(true);
                  }}
                  size="sm"
                  className="w-full mb-4 lowercase"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  new task
                </Button>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {inboxTasks.length === 0 ? (
                    <div className="text-center text-muted-foreground lowercase text-sm py-8">
                      inbox empty
                    </div>
                  ) : (
                    inboxTasks.map((task) => (
                      <DraggableTaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                    ))
                  )}
                </div>
              </div>
            </DroppableDay>
          )}
        </div>

        {/* Main Calendar */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border bg-background p-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInboxExpanded(!inboxExpanded)}
                  className="lowercase"
                >
                  {inboxExpanded ? "hide" : "show"} inbox
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={goToToday} className="lowercase">
                    today
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-bold lowercase">
                  {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </h2>
              </div>
            </div>
          </div>

          {/* Week Grid */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-7 gap-4">
                {weekDays.map((day) => {
                  const dayTasks = getTasksForDay(day);
                  const isCurrentDay = isToday(day);
                  const isPastDay = isPast(day) && !isToday(day);

                  return (
                    <DroppableDay
                      key={day.toISOString()}
                      id={day.toISOString()}
                      isToday={isCurrentDay}
                      isPast={isPastDay}
                    >
                      {/* Day Header */}
                      <div className="mb-3 pb-2 border-b border-border">
                        <div className="text-xs uppercase text-muted-foreground font-medium">
                          {format(day, "EEE")}
                        </div>
                        <div className={`text-2xl font-bold ${isCurrentDay ? "text-primary" : ""}`}>
                          {format(day, "d")}
                        </div>
                      </div>

                      {/* Day Content */}
                      <div className="space-y-2 min-h-[300px]">
                        {dayTasks.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-muted-foreground lowercase text-xs mb-2">
                              no tasks scheduled
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openQuickCapture(day)}
                              className="lowercase text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              add
                            </Button>
                          </div>
                        ) : (
                          <>
                            {/* Tasks with time blocks first */}
                            {dayTasks
                              .filter((t) => t.time_block_start)
                              .map((task) => (
                                <DraggableTaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                              ))}
                            
                            {/* Tasks without time blocks */}
                            {dayTasks
                              .filter((t) => !t.time_block_start)
                              .map((task) => (
                                <DraggableTaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                              ))}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openQuickCapture(day)}
                              className="w-full lowercase text-xs mt-2"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              add
                            </Button>
                          </>
                        )}
                      </div>
                    </DroppableDay>
                  );
                })}
              </div>
            </div>
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

      <QuickCaptureModal 
        open={quickCaptureOpen}
        onOpenChange={setQuickCaptureOpen}
        initialDueDate={selectedDate || undefined}
      />
    </DndContext>
  );
};

export default Calendar;
