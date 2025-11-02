import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ExpenseFormProps {
  onSuccess: () => void;
}

const ExpenseForm = ({ onSuccess }: ExpenseFormProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    description: "",
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
    if (!formData.amount) {
      toast.error("amount is required");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        client_id: formData.client_id || null,
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category || null,
        description: formData.description.trim() || null,
      });

      if (error) throw error;

      toast.success("expense logged");
      setFormData({
        client_id: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        category: "",
        description: "",
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
        <CardTitle className="lowercase">log expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="expense-client" className="lowercase">
              client (optional)
            </Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) =>
                setFormData({ ...formData, client_id: value })
              }
            >
              <SelectTrigger id="expense-client">
                <SelectValue placeholder="select client or leave blank..." />
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
            <Label htmlFor="expense-amount" className="lowercase">
              amount *
            </Label>
            <Input
              id="expense-amount"
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
            <Label htmlFor="expense-date" className="lowercase">
              date
            </Label>
            <Input
              id="expense-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="expense-category" className="lowercase">
              category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger id="expense-category">
                <SelectValue placeholder="select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tools">tools</SelectItem>
                <SelectItem value="software">software</SelectItem>
                <SelectItem value="overhead">overhead</SelectItem>
                <SelectItem value="marketing">marketing</SelectItem>
                <SelectItem value="other">other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expense-description" className="lowercase">
              description
            </Label>
            <Input
              id="expense-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="what was this for?"
            />
          </div>

          <Button type="submit" className="w-full lowercase" disabled={loading}>
            {loading ? "logging..." : "log expense"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;
