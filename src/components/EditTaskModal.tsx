import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
}

interface EditTaskModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const EditTaskModal = ({ task, open, onOpenChange, onUpdate }: EditTaskModalProps) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [category, setCategory] = useState(task.category || "");
  const [isUrgent, setIsUrgent] = useState(task.priority === "urgent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          priority: isUrgent ? "urgent" : "normal",
        })
        .eq("id", task.id);

      if (error) throw error;

      onUpdate();
      onOpenChange(false);
      toast.success("task updated");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="lowercase text-base">edit task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-sm lowercase">
              title
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-sm lowercase">
              description (optional)
            </Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20 resize-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="edit-category" className="text-sm lowercase">
                category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="edit-category" className="h-10">
                  <SelectValue placeholder="select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">client</SelectItem>
                  <SelectItem value="personal">personal</SelectItem>
                  <SelectItem value="idea">idea</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-urgent"
                  checked={isUrgent}
                  onCheckedChange={(checked) => setIsUrgent(checked as boolean)}
                />
                <Label
                  htmlFor="edit-urgent"
                  className="text-sm lowercase cursor-pointer"
                >
                  urgent
                </Label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full lowercase" disabled={isSubmitting}>
            {isSubmitting ? "saving..." : "save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskModal;