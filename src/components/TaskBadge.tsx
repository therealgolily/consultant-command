import { Clock } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  category: string | null;
  parent_task_id: string | null;
  time_block_start: string | null;
  clients?: { name: string } | null;
}

interface TaskBadgeProps {
  task: Task;
  onClick: () => void;
}

const TaskBadge = ({ task, onClick }: TaskBadgeProps) => {
  const isRecurring = !!task.parent_task_id;
  const category = task.category || "client";
  
  // Determine label text
  let label = "";
  if (task.clients?.name) {
    label = task.clients.name;
  } else if (isRecurring) {
    label = "recurring";
  } else if (category === "personal") {
    label = "personal";
  } else if (category === "idea") {
    label = "idea";
  } else {
    label = task.title.slice(0, 20);
  }

  // Determine color classes
  let colorClasses = "";
  if (isRecurring || category === "idea") {
    colorClasses = "bg-category-idea/20 text-category-idea hover:bg-category-idea/30 border-category-idea/30";
  } else if (category === "personal") {
    colorClasses = "bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30 border-green-500/30";
  } else {
    // Client tasks
    colorClasses = "bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/30 border-blue-500/30";
  }

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
        border transition-colors cursor-pointer w-full text-left
        ${colorClasses}
      `}
    >
      <span className="truncate flex-1">{label}</span>
      {task.time_block_start && (
        <span className="flex items-center gap-0.5 text-[10px] opacity-75 shrink-0">
          <Clock className="w-2.5 h-2.5" />
          {format(new Date(task.time_block_start), "h:mm a")}
        </span>
      )}
    </button>
  );
};

export default TaskBadge;
