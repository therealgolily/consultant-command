import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
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

interface Transaction {
  id: string;
  type: "income" | "expense";
  client_name: string | null;
  amount: number;
  date: string;
  notes: string | null;
  description: string | null;
  category: string | null;
}

const RecentTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    transaction: Transaction | null;
  }>({ open: false, transaction: null });

  const fetchTransactions = async () => {
    try {
      const { data: incomeData, error: incomeError } = await supabase
        .from("income")
        .select(`
          id,
          amount,
          date,
          notes,
          clients (name)
        `)
        .order("date", { ascending: false })
        .limit(10);

      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          date,
          description,
          category,
          clients (name)
        `)
        .order("date", { ascending: false })
        .limit(10);

      if (incomeError) throw incomeError;
      if (expenseError) throw expenseError;

      const income: Transaction[] = (incomeData || []).map((item: any) => ({
        id: item.id,
        type: "income" as const,
        client_name: item.clients?.name || null,
        amount: item.amount,
        date: item.date,
        notes: item.notes,
        description: null,
        category: null,
      }));

      const expenses: Transaction[] = (expenseData || []).map((item: any) => ({
        id: item.id,
        type: "expense" as const,
        client_name: item.clients?.name || null,
        amount: item.amount,
        date: item.date,
        notes: null,
        description: item.description,
        category: item.category,
      }));

      const combined = [...income, ...expenses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(combined.slice(0, 20));
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const incomeChannel = supabase
      .channel("income-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "income" },
        fetchTransactions
      )
      .subscribe();

    const expenseChannel = supabase
      .channel("expense-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        fetchTransactions
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incomeChannel);
      supabase.removeChannel(expenseChannel);
    };
  }, []);

  const handleDelete = async () => {
    if (!deleteDialog.transaction) return;

    try {
      const table = deleteDialog.transaction.type === "income" ? "income" : "expenses";
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", deleteDialog.transaction.id);

      if (error) throw error;

      toast.success("transaction deleted");
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialog({ open: false, transaction: null });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="lowercase">recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground lowercase py-8">
            loading...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="lowercase">recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground lowercase py-8">
              start tracking your income and expenses above
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={`${transaction.type}-${transaction.id}`}
                  className="group flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Badge
                      variant={transaction.type === "income" ? "default" : "destructive"}
                      className="lowercase w-20 justify-center"
                    >
                      {transaction.type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {transaction.client_name || "overhead"}
                      </p>
                      {(transaction.notes || transaction.description) && (
                        <p className="text-sm text-muted-foreground truncate">
                          {transaction.notes || transaction.description}
                        </p>
                      )}
                      {transaction.category && (
                        <p className="text-xs text-muted-foreground lowercase">
                          {transaction.category}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold font-mono ${
                          transaction.type === "income"
                            ? "text-category-personal"
                            : "text-destructive"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}$
                        {transaction.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transaction.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          setDeleteDialog({ open: true, transaction })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ open: false, transaction: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="lowercase">
              delete transaction?
            </AlertDialogTitle>
            <AlertDialogDescription className="lowercase">
              this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="lowercase">cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="lowercase bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RecentTransactions;
