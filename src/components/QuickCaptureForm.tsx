import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface QuickCaptureFormProps {
  onSuccess?: () => void;
}

interface Client {
  id: string;
  name: string;
}

const QuickCaptureForm = ({ onSuccess }: QuickCaptureFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      if (!error) {
        setClients(data || []);
      }
    };

    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("no user found");

      const { error } = await supabase.from("tasks").insert({
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        client_id: clientId || null,
        priority: isUrgent ? "urgent" : "normal",
        status: "inbox",
        user_id: user.id,
      });

      if (error) throw error;

      setTitle("");
      setDescription("");
      setCategory("");
      setClientId("");
      setIsUrgent(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm lowercase">
          title
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="what needs to be done?"
          autoFocus
          required
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm lowercase">
          description (optional)
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="add details..."
          className="min-h-20 resize-none"
        />
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="category" className="text-sm lowercase">
              category
            </Label>
            <Select value={category} onValueChange={(value) => {
              setCategory(value);
              if (value !== "client") setClientId("");
            }}>
              <SelectTrigger id="category" className="h-10">
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
                id="urgent"
                checked={isUrgent}
                onCheckedChange={(checked) => setIsUrgent(checked as boolean)}
              />
              <Label
                htmlFor="urgent"
                className="text-sm lowercase cursor-pointer"
              >
                urgent
              </Label>
            </div>
          </div>
        </div>

        {category === "client" && (
          <div className="space-y-2">
            <Label htmlFor="client" className="text-sm lowercase">
              client
            </Label>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground lowercase">
                add clients first
              </p>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client" className="h-10">
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
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full lowercase" disabled={isSubmitting}>
        {isSubmitting ? "adding..." : "add task"}
      </Button>
    </form>
  );
};

export default QuickCaptureForm;