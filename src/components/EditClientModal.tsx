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
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  payment_method: string | null;
  monthly_rate: number | null;
  last_payment_date: string | null;
  next_expected_payment_date: string | null;
  notes: string | null;
}

interface EditClientModalProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const EditClientModal = ({
  client,
  open,
  onOpenChange,
  onUpdate,
}: EditClientModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email || "",
    phone: client.phone || "",
    payment_method: client.payment_method || "",
    monthly_rate: client.monthly_rate?.toString() || "",
    last_payment_date: client.last_payment_date || "",
    next_expected_payment_date: client.next_expected_payment_date || "",
    notes: client.notes || "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        payment_method: client.payment_method || "",
        monthly_rate: client.monthly_rate?.toString() || "",
        last_payment_date: client.last_payment_date || "",
        next_expected_payment_date: client.next_expected_payment_date || "",
        notes: client.notes || "",
      });
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("client name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          payment_method: formData.payment_method || null,
          monthly_rate: formData.monthly_rate
            ? parseFloat(formData.monthly_rate)
            : null,
          last_payment_date: formData.last_payment_date || null,
          next_expected_payment_date: formData.next_expected_payment_date || null,
          notes: formData.notes.trim() || null,
        })
        .eq("id", client.id);

      if (error) throw error;

      toast.success("client updated");
      onUpdate();
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
          <DialogTitle className="lowercase">edit client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="lowercase">
              name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="client name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="lowercase">
                email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="lowercase">
                phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method" className="lowercase">
                payment method
              </Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">check</SelectItem>
                  <SelectItem value="quickbooks">quickbooks</SelectItem>
                  <SelectItem value="stripe">stripe</SelectItem>
                  <SelectItem value="direct_deposit">direct deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="monthly_rate" className="lowercase">
                monthly rate
              </Label>
              <Input
                id="monthly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_rate}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_rate: e.target.value })
                }
                placeholder="5000.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="last_payment_date" className="lowercase">
                last payment date
              </Label>
              <Input
                id="last_payment_date"
                type="date"
                value={formData.last_payment_date}
                onChange={(e) =>
                  setFormData({ ...formData, last_payment_date: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="next_expected_payment_date" className="lowercase">
                next expected payment
              </Label>
              <Input
                id="next_expected_payment_date"
                type="date"
                value={formData.next_expected_payment_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    next_expected_payment_date: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="lowercase">
              notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="general notes about this client"
              rows={3}
            />
          </div>

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
              {loading ? "saving..." : "save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientModal;
