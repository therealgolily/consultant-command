import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import IncomeForm from "./IncomeForm";
import ExpenseForm from "./ExpenseForm";
import RecentTransactions from "./RecentTransactions";

const LogTab = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IncomeForm onSuccess={handleSuccess} />
        <ExpenseForm onSuccess={handleSuccess} />
      </div>

      <RecentTransactions key={refreshKey} />
    </div>
  );
};

export default LogTab;
