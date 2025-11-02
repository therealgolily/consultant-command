import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { format } from "date-fns";

interface Client {
  id: string;
  name: string;
}

interface IncomeFormProps {
  onSuccess: () => void;
}

const IncomeForm = ({ onSuccess }: IncomeFormProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

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
    if (!formData.client_id || !formData.amount) {
      toast.error("client and amount are required");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      const { error } = await supabase.from("income").insert({
        user_id: user.id,
        client_id: formData.client_id,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes.trim() || null,
      });

      if (error) throw error;

      toast.success("income logged");
      setFormData({
        client_id: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="lowercase">log income</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="income-client" className="lowercase">
              client *
            </Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) =>
                setFormData({ ...formData, client_id: value })
              }
            >
              <SelectTrigger id="income-client">
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

          <div>
            <Label htmlFor="income-amount" className="lowercase">
              amount *
            </Label>
            <Input
              id="income-amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="income-date" className="lowercase">
              date
            </Label>
            <Input
              id="income-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="income-notes" className="lowercase">
              notes (optional)
            </Label>
            <Textarea
              id="income-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="add notes..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full lowercase" disabled={loading}>
            {loading ? "logging..." : "log income"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default IncomeForm;
