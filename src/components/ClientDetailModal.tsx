import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import CompletableTaskCard from "./CompletableTaskCard";
import EditClientModal from "./EditClientModal";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { format } from "date-fns";

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

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
}

interface Income {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
}

interface Expense {
  id: string;
  amount: number;
  date: string;
  category: string | null;
  description: string | null;
}

interface ClientDetailModalProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const ClientDetailModal = ({
  client,
  open,
  onOpenChange,
  onUpdate,
}: ClientDetailModalProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notes, setNotes] = useState(client.notes || "");
  const [lastPaymentDate, setLastPaymentDate] = useState(
    client.last_payment_date || ""
  );
  const [nextPaymentDate, setNextPaymentDate] = useState(
    client.next_expected_payment_date || ""
  );

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setTasks(data || []);
    }
  };

  const fetchIncome = async () => {
    const { data, error } = await supabase
      .from("income")
      .select("id, amount, date, notes")
      .eq("client_id", client.id)
      .order("date", { ascending: false });

    if (!error) {
      setIncome(data || []);
    }
  };

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, amount, date, category, description")
      .eq("client_id", client.id)
      .order("date", { ascending: false });

    if (!error) {
      setExpenses(data || []);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTasks();
      fetchIncome();
      fetchExpenses();
      setNotes(client.notes || "");
      setLastPaymentDate(client.last_payment_date || "");
      setNextPaymentDate(client.next_expected_payment_date || "");
    }
  }, [open, client]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Check if client has tasks
      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id);

      if (count && count > 0) {
        toast.error("cannot delete client with active tasks");
        setIsDeleting(false);
        setShowDeleteDialog(false);
        return;
      }

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);

      if (error) throw error;

      toast.success("client deleted");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleNotesBlur = async () => {
    if (notes === client.notes) return;

    try {
      const { error } = await supabase
        .from("clients")
        .update({ notes: notes.trim() || null })
        .eq("id", client.id);

      if (error) throw error;
      toast.success("notes saved");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePaymentDateUpdate = async (
    field: "last_payment_date" | "next_expected_payment_date",
    value: string
  ) => {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ [field]: value || null })
        .eq("id", client.id);

      if (error) throw error;
      toast.success("payment date updated");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const completedTasks = tasks.filter((t) => t.status === "done");
  
  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">{client.name}</DialogTitle>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {client.email && <p>{client.email}</p>}
                  {client.phone && <p>{client.phone}</p>}
                </div>
                
                {/* Profitability Card */}
                {(totalIncome > 0 || totalExpenses > 0) && (
                  <div className="mt-4 p-4 rounded-lg border bg-card">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground lowercase">total income</p>
                        <p className="text-lg font-bold font-mono text-category-personal">
                          ${totalIncome.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground lowercase">total expenses</p>
                        <p className="text-lg font-bold font-mono text-destructive">
                          ${totalExpenses.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground lowercase">net profit</p>
                        <p
                          className={`text-lg font-bold font-mono ${
                            netProfit >= 0 ? "text-category-personal" : "text-destructive"
                          }`}
                        >
                          ${netProfit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowEditModal(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="tasks" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tasks" className="lowercase">
                tasks
              </TabsTrigger>
              <TabsTrigger value="payments" className="lowercase">
                payments
              </TabsTrigger>
              <TabsTrigger value="expenses" className="lowercase">
                expenses
              </TabsTrigger>
              <TabsTrigger value="notes" className="lowercase">
                notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              {activeTasks.length === 0 && completedTasks.length === 0 ? (
                <div className="text-center text-muted-foreground lowercase py-8">
                  no tasks for this client yet
                </div>
              ) : (
                <>
                  {activeTasks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold lowercase mb-3">
                        active ({activeTasks.length})
                      </h3>
                      <div className="space-y-3">
                        {activeTasks.map((task) => (
                          <CompletableTaskCard
                            key={task.id}
                            task={task}
                            onUpdate={fetchTasks}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {completedTasks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold lowercase mb-3">
                        completed ({completedTasks.length})
                      </h3>
                      <div className="space-y-3 opacity-60">
                        {completedTasks.map((task) => (
                          <CompletableTaskCard
                            key={task.id}
                            task={task}
                            onUpdate={fetchTasks}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {client.monthly_rate && (
                    <div>
                      <Label className="lowercase text-xs text-muted-foreground">
                        monthly rate
                      </Label>
                      <p className="text-xl font-bold font-mono text-accent">
                        ${client.monthly_rate.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}

                  {client.payment_method && (
                    <div>
                      <Label className="lowercase text-xs text-muted-foreground">
                        payment method
                      </Label>
                      <p className="text-sm capitalize">
                        {client.payment_method.replace("_", " ")}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="lowercase text-xs text-muted-foreground">
                      total income
                    </Label>
                    <p className="text-xl font-bold font-mono text-category-personal">
                      ${totalIncome.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="last_payment" className="lowercase">
                      last payment date
                    </Label>
                    <Input
                      id="last_payment"
                      type="date"
                      value={lastPaymentDate}
                      onChange={(e) => setLastPaymentDate(e.target.value)}
                      onBlur={(e) =>
                        handlePaymentDateUpdate("last_payment_date", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="next_payment" className="lowercase">
                      next expected payment
                    </Label>
                    <Input
                      id="next_payment"
                      type="date"
                      value={nextPaymentDate}
                      onChange={(e) => setNextPaymentDate(e.target.value)}
                      onBlur={(e) =>
                        handlePaymentDateUpdate(
                          "next_expected_payment_date",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold lowercase mb-3">
                    payment history ({income.length})
                  </h3>
                  {income.length === 0 ? (
                    <p className="text-center text-muted-foreground lowercase py-8">
                      no payments recorded yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {income.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-mono font-semibold text-category-personal">
                              ${Number(payment.amount).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                            {payment.notes && (
                              <p className="text-sm text-muted-foreground">
                                {payment.notes}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payment.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="expenses" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="lowercase text-xs text-muted-foreground">
                      total expenses
                    </Label>
                    <p className="text-2xl font-bold font-mono text-destructive">
                      ${totalExpenses.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold lowercase mb-3">
                    expense history ({expenses.length})
                  </h3>
                  {expenses.length === 0 ? (
                    <p className="text-center text-muted-foreground lowercase py-8">
                      no expenses tracked yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex-1">
                            <p className="font-mono font-semibold text-destructive">
                              ${Number(expense.amount).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                            {expense.description && (
                              <p className="text-sm">{expense.description}</p>
                            )}
                            {expense.category && (
                              <p className="text-xs text-muted-foreground lowercase">
                                {expense.category}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(expense.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <div>
                <Label htmlFor="notes" className="lowercase">
                  general notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="add notes about this client..."
                  rows={8}
                  className="mt-2"
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EditClientModal
        client={client}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdate={onUpdate}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="lowercase">
              delete client?
            </AlertDialogTitle>
            <AlertDialogDescription className="lowercase">
              this action cannot be undone. you can only delete clients with no
              active tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="lowercase">cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="lowercase bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientDetailModal;
