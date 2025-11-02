import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import TaskCard from "./TaskCard";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
}

interface DraggableTaskCardProps {
  task: Task;
  onUpdate: () => void;
  isDragging?: boolean;
}

const DraggableTaskCard = ({ task, onUpdate, isDragging = false }: DraggableTaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...listeners}
        {...attributes}
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="pl-6">
        <TaskCard task={task} onUpdate={onUpdate} />
      </div>
    </div>
  );
};

export default DraggableTaskCard;
