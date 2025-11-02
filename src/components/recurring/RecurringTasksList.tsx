import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Pause, Play, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getRecurrenceLabel } from "@/utils/recurringTaskEngine";
import RecurringTaskModal from "./RecurringTaskModal";

interface RecurringTask {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  category: string | null;
  priority: string;
  status: string;
  recurrence_rule: string;
  is_paused: boolean;
  clients?: { name: string } | null;
}

interface RecurringTasksListProps {
  tasks: RecurringTask[];
  onUpdate: () => void;
}

const RecurringTasksList = ({ tasks, onUpdate }: RecurringTasksListProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<RecurringTask | null>(null);
  const [deleteInstances, setDeleteInstances] = useState(false);

  const handleTogglePause = async (task: RecurringTask) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_paused: !task.is_paused })
        .eq("id", task.id);

      if (error) throw error;
      toast.success(task.is_paused ? "recurring task resumed" : "recurring task paused");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;

    try {
      if (deleteInstances) {
        // Delete all instances first
        await supabase
          .from("tasks")
          .delete()
          .eq("parent_task_id", selectedTask.id);
      } else {
        // Orphan instances by clearing parent_task_id
        await supabase
          .from("tasks")
          .update({ parent_task_id: null })
          .eq("parent_task_id", selectedTask.id);
      }

      // Delete parent task
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", selectedTask.id);

      if (error) throw error;

      toast.success("recurring task deleted");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setShowDeleteDialog(false);
      setSelectedTask(null);
      setDeleteInstances(false);
    }
  };

  const getBucketBadge = (status: string) => {
    const labels: Record<string, string> = {
      today: "today",
      tomorrow: "tomorrow",
      this_week: "this week",
    };
    return labels[status] || status;
  };

  return (
    <>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`group p-4 rounded-lg border bg-card hover:shadow-md transition-all ${
              task.is_paused ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">
                    {task.title}
                  </h3>
                  {task.is_paused && (
                    <span className="text-xs text-muted-foreground lowercase">
                      (paused)
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground lowercase mb-2">
                  {getRecurrenceLabel(task.recurrence_rule)}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="lowercase">
                    → {getBucketBadge(task.status)}
                  </Badge>
                  {task.clients && (
                    <Badge variant="secondary" className="lowercase">
                      {task.clients.name}
                    </Badge>
                  )}
                  {task.priority === "urgent" && (
                    <span className="w-2 h-2 bg-destructive rounded-full" />
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setSelectedTask(task);
                    setShowEditModal(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleTogglePause(task)}
                >
                  {task.is_paused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => {
                    setSelectedTask(task);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RecurringTaskModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        task={selectedTask}
        onSuccess={onUpdate}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="lowercase">
              delete recurring task?
            </AlertDialogTitle>
            <AlertDialogDescription className="lowercase">
              this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="delete-instances"
                checked={deleteInstances}
                onCheckedChange={(checked) => setDeleteInstances(checked as boolean)}
              />
              <Label htmlFor="delete-instances" className="lowercase cursor-pointer">
                also delete all existing instances
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="lowercase">cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="lowercase bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RecurringTasksList;
