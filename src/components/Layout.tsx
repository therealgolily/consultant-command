import { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Calendar, Keyboard } from "lucide-react";
import QuickCaptureModal from "./QuickCaptureModal";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Layout = () => {
  const navigate = useNavigate();
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pendingNavKey, setPendingNavKey] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for quick capture
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
        return;
      }

      // ? to toggle shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
        return;
      }

      // Esc to close modals
      if (e.key === "Escape") {
        setIsQuickCaptureOpen(false);
        setShowShortcuts(false);
        setPendingNavKey(null);
        return;
      }

      // Navigation shortcuts (G then letter)
      if (e.key.toLowerCase() === "g" && !pendingNavKey) {
        e.preventDefault();
        setPendingNavKey("g");
        setTimeout(() => setPendingNavKey(null), 1000);
        return;
      }

      if (pendingNavKey === "g") {
        e.preventDefault();
        setPendingNavKey(null);
        
        switch (e.key.toLowerCase()) {
          case "p":
            navigate("/");
            break;
          case "c":
            navigate("/calendar");
            break;
          case "l":
            navigate("/clients");
            break;
          case "m":
            navigate("/money");
            break;
          case "t":
            navigate("/");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, pendingNavKey, showShortcuts]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="w-52 border-r border-border bg-sidebar flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-sidebar-foreground lowercase tracking-tight">
            command center
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm lowercase transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            planning
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-sm lowercase transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            <Calendar className="w-4 h-4" />
            calendar
          </NavLink>
          <NavLink
            to="/clients"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm lowercase transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            clients
          </NavLink>
          <NavLink
            to="/money"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm lowercase transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            money
          </NavLink>
        </nav>

        <div className="p-4 space-y-2 border-t border-border">
          <Button
            onClick={() => setIsQuickCaptureOpen(true)}
            className="w-full justify-start lowercase"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            quick capture
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowShortcuts(true)}
                  variant="ghost"
                  className="w-full justify-start lowercase text-muted-foreground hover:text-foreground"
                  size="sm"
                >
                  <Keyboard className="w-4 h-4 mr-2" />
                  shortcuts
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="lowercase">keyboard shortcuts (?)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start lowercase text-muted-foreground hover:text-foreground"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <QuickCaptureModal 
        open={isQuickCaptureOpen} 
        onOpenChange={setIsQuickCaptureOpen}
      />

      <KeyboardShortcutsModal
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
};

export default Layout;