import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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

interface CompactTaskCardProps {
  task: Task;
  onClick: () => void;
  onUpdate: () => void;
}

const CompactTaskCard = ({ task, onClick, onUpdate }: CompactTaskCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        group p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer
        ${task.priority === "urgent" ? "border-l-4 border-l-destructive" : ""}
        ${isCompleting ? "opacity-50 animate-out fade-out" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        <div onClick={handleComplete} className="pt-0.5">
          <Checkbox
            checked={false}
            disabled={isCompleting}
            className="cursor-pointer"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate mb-1">
            {task.title}
          </h4>
          
          <div className="flex items-center gap-2 flex-wrap">
            {task.clients && (
              <Badge variant="secondary" className="lowercase text-xs">
                {task.clients.name}
              </Badge>
            )}
            
            {task.time_block_start && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(task.time_block_start), "h:mm a")}
              </span>
            )}
            
            {task.priority === "urgent" && (
              <span className="w-2 h-2 bg-destructive rounded-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactTaskCard;
