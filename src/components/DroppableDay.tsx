import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableDayProps {
  id: string;
  children: ReactNode;
  isToday: boolean;
  isPast: boolean;
}

const DroppableDay = ({ id, children, isToday, isPast }: DroppableDayProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] border rounded-lg p-3 transition-all duration-200 ${
        isOver
          ? "border-primary border-2 bg-primary/10 shadow-lg"
          : isToday
          ? "border-primary bg-primary/5"
          : isPast
          ? "border-border bg-muted/30"
          : "border-border bg-card"
      }`}
    >
      {children}
    </div>
  );
};

export default DroppableDay;
