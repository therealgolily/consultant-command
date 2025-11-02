import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Planning from "./pages/Planning";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import Money from "./pages/Money";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { runRecurringTaskEngine } from "./utils/recurringTaskEngine";
import { toast } from "sonner";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Run recurring task engine on app load
    const runEngine = async () => {
      const instancesCreated = await runRecurringTaskEngine();
      if (instancesCreated > 0) {
        toast.success(`created ${instancesCreated} recurring ${instancesCreated === 1 ? "task" : "tasks"} for today`);
      }
    };
    runEngine();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/money" element={<Money />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
