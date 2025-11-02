import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import EditTaskModal from "./EditTaskModal";

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
  parent_task_id: string | null;
  clients?: { name: string } | null;
}

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const TaskDetailModal = ({ task, open, onOpenChange, onUpdate }: TaskDetailModalProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  if (!task) return null;

  const handleComplete = async () => {
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
      toast.success("task completed");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;
      toast.success("task deleted");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="lowercase text-xl">{task.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {task.description && (
              <div>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {task.clients && (
                <Badge variant="secondary" className="lowercase">
                  {task.clients.name}
                </Badge>
              )}
              {task.category && (
                <Badge 
                  variant="outline" 
                  className={`lowercase ${
                    task.category === "client" ? "border-category-client text-category-client" :
                    task.category === "personal" ? "border-category-personal text-category-personal" :
                    task.category === "idea" ? "border-category-idea text-category-idea" : ""
                  }`}
                >
                  {task.category}
                </Badge>
              )}
              {task.priority === "urgent" && (
                <Badge variant="destructive" className="lowercase">urgent</Badge>
              )}
              {task.parent_task_id && (
                <Badge variant="secondary" className="lowercase bg-category-idea/20 text-category-idea border-category-idea/30">
                  recurring
                </Badge>
              )}
            </div>

            {task.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="lowercase">due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
              </div>
            )}

            {task.time_block_start && task.time_block_end && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="lowercase">
                  {format(new Date(task.time_block_start), "h:mm a")} - {format(new Date(task.time_block_end), "h:mm a")}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="complete"
                checked={false}
                onCheckedChange={handleComplete}
                disabled={isCompleting}
              />
              <Label htmlFor="complete" className="lowercase cursor-pointer">
                mark as complete
              </Label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="lowercase"
            >
              <Pencil className="w-4 h-4 mr-2" />
              edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="lowercase text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showEditModal && (
        <EditTaskModal
          task={task}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onUpdate={() => {
            onUpdate();
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
};

export default TaskDetailModal;
