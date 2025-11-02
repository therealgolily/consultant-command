import { useState, useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import QuickCaptureModal from "./QuickCaptureModal";

const Layout = () => {
  const navigate = useNavigate();
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

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
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
            today
          </NavLink>
          <NavLink
            to="/planning"
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
    </div>
  );
};

export default Layout;