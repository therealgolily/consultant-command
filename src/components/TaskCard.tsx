import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Clock, Repeat } from "lucide-react";
import { toast } from "sonner";
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
import EditTaskModal from "./EditTaskModal";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
  parent_task_id?: string | null;
  time_block_start?: string | null;
  time_block_end?: string | null;
}

interface TaskCardProps {
  task: Task;
  onUpdate: () => void;
}

const TaskCard = ({ task, onUpdate }: TaskCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;
      onUpdate();
      toast.success("task deleted");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return "";
    switch (category) {
      case "client":
        return "bg-category-client/10 text-category-client border-category-client/20";
      case "personal":
        return "bg-category-personal/10 text-category-personal border-category-personal/20";
      case "idea":
        return "bg-category-idea/10 text-category-idea border-category-idea/20";
      default:
        return "";
    }
  };

  return (
    <>
      <div
        className={`group bg-card border rounded-md p-4 hover:shadow-md transition-all duration-150 animate-fade-in ${
          task.priority === "urgent" ? "border-l-2 border-l-destructive" : "border-border"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {task.title}
              </h3>
              {task.priority === "urgent" && (
                <span className="w-2 h-2 bg-destructive rounded-full flex-shrink-0" />
              )}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.parent_task_id && (
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs lowercase border bg-category-idea/10 text-category-idea border-category-idea/20"
                >
                  <Repeat className="h-3 w-3" />
                  recurring
                </Badge>
              )}
              {task.time_block_start && task.time_block_end && (
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs lowercase"
                >
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.time_block_start), "h:mm a")} -{" "}
                  {format(new Date(task.time_block_end), "h:mm a")}
                </Badge>
              )}
              {task.category && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs lowercase border ${getCategoryColor(
                    task.category
                  )}`}
                >
                  {task.category}
                </span>
              )}
              <span className="text-xs text-muted-foreground lowercase">
                {formatDistanceToNow(new Date(task.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowEditModal(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="lowercase">delete task?</AlertDialogTitle>
            <AlertDialogDescription className="lowercase">
              this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="lowercase">cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="lowercase bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditTaskModal
        task={task}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdate={onUpdate}
      />
    </>
  );
};

export default TaskCard;