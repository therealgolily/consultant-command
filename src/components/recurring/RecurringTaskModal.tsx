import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
}

interface RecurringTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  task?: any;
}

const RecurringTaskModal = ({
  open,
  onOpenChange,
  onSuccess,
  task,
}: RecurringTaskModalProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTimeBlocks, setShowTimeBlocks] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client_id: "",
    category: "",
    priority: "normal",
    recurrence_rule: "",
    bucket: "today",
    time_block_start: "",
    time_block_end: "",
  });

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      setClients(data || []);
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (open && task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        client_id: task.client_id || "",
        category: task.category || "",
        priority: task.priority,
        recurrence_rule: task.recurrence_rule,
        bucket: task.status,
        time_block_start: task.time_block_start ? task.time_block_start.slice(0, 16) : "",
        time_block_end: task.time_block_end ? task.time_block_end.slice(0, 16) : "",
      });
      setShowTimeBlocks(!!(task.time_block_start || task.time_block_end));
    } else if (open && !task) {
      setFormData({
        title: "",
        description: "",
        client_id: "",
        category: "",
        priority: "normal",
        recurrence_rule: "",
        bucket: "today",
        time_block_start: "",
        time_block_end: "",
      });
      setShowTimeBlocks(false);
    }
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.recurrence_rule) {
      toast.error("title and recurrence pattern are required");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      const taskData = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        client_id: formData.client_id || null,
        category: formData.category || null,
        priority: formData.priority,
        recurrence_rule: formData.recurrence_rule,
        status: formData.bucket,
        is_recurring: true,
        time_block_start: formData.time_block_start || null,
        time_block_end: formData.time_block_end || null,
      };

      if (task) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", task.id);
        if (error) throw error;
        toast.success("recurring task updated");
      } else {
        const { error } = await supabase.from("tasks").insert(taskData);
        if (error) throw error;
        toast.success("recurring task created");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="lowercase">
            {task ? "edit recurring task" : "set up recurring task"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="lowercase">
              title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="task title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="lowercase">
              description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="add details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="lowercase">
                category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData({ ...formData, category: value });
                  if (value !== "client") setFormData({ ...formData, client_id: "" });
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">client</SelectItem>
                  <SelectItem value="personal">personal</SelectItem>
                  <SelectItem value="idea">idea</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.category === "client" && (
              <div>
                <Label htmlFor="client" className="lowercase">
                  client
                </Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder="select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="lowercase">priority</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="priority"
                    value="normal"
                    checked={formData.priority === "normal"}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                  <span className="text-sm lowercase">normal</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="priority"
                    value="urgent"
                    checked={formData.priority === "urgent"}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                  <span className="text-sm lowercase">urgent</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="bucket" className="lowercase">
                create instances in *
              </Label>
              <Select
                value={formData.bucket}
                onValueChange={(value) => setFormData({ ...formData, bucket: value })}
              >
                <SelectTrigger id="bucket">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">today</SelectItem>
                  <SelectItem value="tomorrow">tomorrow</SelectItem>
                  <SelectItem value="this_week">this week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="recurrence" className="lowercase">
              recurrence pattern *
            </Label>
            <Select
              value={formData.recurrence_rule}
              onValueChange={(value) => setFormData({ ...formData, recurrence_rule: value })}
            >
              <SelectTrigger id="recurrence">
                <SelectValue placeholder="select pattern..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly-monday">Weekly on Monday</SelectItem>
                <SelectItem value="weekly-tuesday">Weekly on Tuesday</SelectItem>
                <SelectItem value="weekly-wednesday">Weekly on Wednesday</SelectItem>
                <SelectItem value="weekly-thursday">Weekly on Thursday</SelectItem>
                <SelectItem value="weekly-friday">Weekly on Friday</SelectItem>
                <SelectItem value="monthly-1">Monthly on 1st</SelectItem>
                <SelectItem value="monthly-5">Monthly on 5th</SelectItem>
                <SelectItem value="monthly-15">Monthly on 15th</SelectItem>
                <SelectItem value="monthly-last">Monthly on last day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={showTimeBlocks} onOpenChange={setShowTimeBlocks}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm lowercase">
              <ChevronDown className={`h-4 w-4 transition-transform ${showTimeBlocks ? "" : "-rotate-90"}`} />
              schedule time (optional)
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time" className="lowercase">
                    start time
                  </Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.time_block_start}
                    onChange={(e) => setFormData({ ...formData, time_block_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time" className="lowercase">
                    end time
                  </Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.time_block_end}
                    onChange={(e) => setFormData({ ...formData, time_block_end: e.target.value })}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {task && (
            <p className="text-sm text-muted-foreground lowercase">
              note: changes will affect future instances, not existing ones
            </p>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="lowercase"
            >
              cancel
            </Button>
            <Button type="submit" disabled={loading} className="lowercase">
              {loading ? "saving..." : task ? "save changes" : "create recurring task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecurringTaskModal;
