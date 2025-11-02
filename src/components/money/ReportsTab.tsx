import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface ClientStats {
  id: string;
  name: string;
  income: number;
  expenses: number;
  net: number;
  margin: number;
}

interface ExpenseByCategory {
  category: string;
  total: number;
}

const ReportsTab = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [clientStats, setClientStats] = useState<ClientStats[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);
  const [expectedIncome, setExpectedIncome] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      // Fetch monthly income
      const { data: incomeData } = await supabase
        .from("income")
        .select("amount")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const totalIncome = incomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      setMonthlyIncome(totalIncome);

      // Fetch monthly expenses
      const { data: expenseData } = await supabase
        .from("expenses")
        .select("amount, category")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const totalExpenses = expenseData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      setMonthlyExpenses(totalExpenses);

      // Expenses by category
      const categoryMap = new Map<string, number>();
      expenseData?.forEach((expense) => {
        const cat = expense.category || "uncategorized";
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(expense.amount));
      });
      setExpensesByCategory(
        Array.from(categoryMap.entries()).map(([category, total]) => ({ category, total }))
      );

      // Fetch clients with their stats
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, monthly_rate");

      if (clients) {
        const statsPromises = clients.map(async (client) => {
          const { data: clientIncome } = await supabase
            .from("income")
            .select("amount")
            .eq("client_id", client.id);

          const { data: clientExpenses } = await supabase
            .from("expenses")
            .select("amount")
            .eq("client_id", client.id);

          const income = clientIncome?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
          const expenses = clientExpenses?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
          const net = income - expenses;
          const margin = income > 0 ? (net / income) * 100 : 0;

          return {
            id: client.id,
            name: client.name,
            income,
            expenses,
            net,
            margin,
          };
        });

        const stats = await Promise.all(statsPromises);
        setClientStats(stats.sort((a, b) => b.net - a.net));

        // Calculate expected income
        const expected = clients.reduce(
          (sum, client) => sum + (Number(client.monthly_rate) || 0),
          0
        );
        setExpectedIncome(expected);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const netProfit = monthlyIncome - monthlyExpenses;

  if (loading) {
    return (
      <div className="text-center text-muted-foreground lowercase py-12">
        loading reports...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="lowercase">monthly summary</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold min-w-[120px] text-center">
                {format(selectedMonth, "MMMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground lowercase mb-1">total income</p>
              <p className="text-2xl font-bold font-mono text-category-personal">
                ${monthlyIncome.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground lowercase mb-1">total expenses</p>
              <p className="text-2xl font-bold font-mono text-destructive">
                ${monthlyExpenses.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground lowercase mb-1">net profit</p>
              <p
                className={`text-2xl font-bold font-mono ${
                  netProfit >= 0 ? "text-category-personal" : "text-destructive"
                }`}
              >
                ${netProfit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="lowercase">by client breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {clientStats.length === 0 ? (
            <p className="text-center text-muted-foreground lowercase py-8">
              no client data yet
            </p>
          ) : (
            <div className="space-y-4">
              {clientStats.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{client.name}</p>
                    <p className="text-sm text-muted-foreground lowercase">
                      margin: {client.margin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground lowercase">income</p>
                      <p className="font-mono font-semibold text-category-personal">
                        ${client.income.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground lowercase">expenses</p>
                      <p className="font-mono font-semibold text-destructive">
                        ${client.expenses.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground lowercase">net</p>
                      <p
                        className={`font-mono font-semibold ${
                          client.net >= 0 ? "text-category-personal" : "text-destructive"
                        }`}
                      >
                        ${client.net.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="lowercase">expense breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <p className="text-center text-muted-foreground lowercase py-8">
                no expenses this month
              </p>
            ) : (
              <div className="space-y-3">
                {expensesByCategory.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between"
                  >
                    <span className="lowercase">{item.category}</span>
                    <span className="font-mono font-semibold">
                      ${item.total.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="lowercase">forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground lowercase mb-1">
                  expected income next month
                </p>
                <p className="text-2xl font-bold font-mono text-accent">
                  ${expectedIncome.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground lowercase mb-3">
                  based on client monthly rates
                </p>
                {clientStats.map((client) => {
                  // This is a simplification - in reality you'd calculate from next_expected_payment_date
                  return (
                    <div key={client.id} className="text-sm py-1">
                      <span className="text-muted-foreground">{client.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsTab;
