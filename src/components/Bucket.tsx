import { useDroppable } from "@dnd-kit/core";
import DraggableTaskCard from "./DraggableTaskCard";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
}

interface BucketProps {
  id: string;
  tasks: Task[];
  onUpdate: () => void;
}

const Bucket = ({ id, tasks, onUpdate }: BucketProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-lg border-2 border-dashed p-4 transition-colors ${
        isOver
          ? "border-accent bg-accent/5"
          : "border-border bg-card/50"
      }`}
    >
      {tasks.length === 0 ? (
        <div className="text-center text-muted-foreground lowercase py-8 text-sm">
          {id === "inbox" ? "no tasks yet" : "drag tasks here"}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <DraggableTaskCard key={task.id} task={task} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bucket;
