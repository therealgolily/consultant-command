import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
}

interface CompletableTaskCardProps {
  task: Task;
  onUpdate: () => void;
}

const CompletableTaskCard = ({ task, onUpdate }: CompletableTaskCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async (checked: boolean) => {
    if (!checked) return;
    
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "done",
          completed_at: new Date().toISOString()
        })
        .eq("id", task.id);

      if (error) throw error;
      
      // Delay the update to show fade animation
      setTimeout(() => {
        onUpdate();
        toast.success("task completed");
      }, 200);
    } catch (error: any) {
      toast.error(error.message);
      setIsCompleting(false);
    }
  };

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
        className={`group bg-card border rounded-md p-4 hover:shadow-md transition-all duration-200 ${
          isCompleting ? "animate-fade-out opacity-0" : "animate-fade-in"
        } ${
          task.priority === "urgent" ? "border-l-4 border-l-destructive" : "border-border"
        }`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={false}
            onCheckedChange={handleComplete}
            className="mt-1 h-5 w-5"
            disabled={isCompleting}
          />
          
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
            <div className="flex items-center gap-2 mt-2">
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

export default CompletableTaskCard;
