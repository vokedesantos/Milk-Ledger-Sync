import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  WifiOff,
  Home,
  Users,
  Truck,
  FileText,
  Menu,
  X,
  Server,
  BookUser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncRecords, useHealthCheck } from "@workspace/api-client-react";
import { getUnsyncedRecords, markRecordsSynced } from "@/lib/db";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const syncMutation = useSyncRecords();
  const { data: health } = useHealthCheck();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);

      const unsynced = await getUnsyncedRecords();
      if (unsynced.length > 0) {
        toast({
          title: "Back online",
          description: `Syncing ${unsynced.length} records...`,
        });

        try {
          await syncMutation.mutateAsync({ data: { records: unsynced } });
          await markRecordsSynced(unsynced.map((r) => r.localId));
          queryClient.invalidateQueries();
          toast({
            title: "Sync complete",
            description: "All records are now backed up.",
          });
        } catch (e) {
          console.error("Sync failed", e);
        }
      }
    };

    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncMutation, queryClient, toast]);

  const navItems = [
    { href: "/", label: "Dashboard", icon: <Home className="w-5 h-5" /> },
    { href: "/farmer", label: "Collect Milk", icon: <Truck className="w-5 h-5" /> },
    { href: "/customer", label: "Sell Milk", icon: <Users className="w-5 h-5" /> },
    { href: "/contacts", label: "Contacts", icon: <BookUser className="w-5 h-5" /> },
    { href: "/records", label: "All Records", icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-primary text-primary-foreground">
        <h1 className="text-xl font-bold tracking-tight">MilkSys</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-primary-foreground hover:bg-primary/90"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
        ${isSidebarOpen ? "block" : "hidden"} 
        md:block w-full md:w-64 bg-sidebar border-r border-sidebar-border
        fixed md:sticky top-[60px] md:top-0 h-[calc(100dvh-60px)] md:h-[100dvh] z-40
        flex flex-col
      `}
      >
        <div className="p-6 hidden md:block">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground">MilkSys</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }
                `}
                onClick={() => setIsSidebarOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <Server className="w-4 h-4" />
            <span>
              Server:{" "}
              {health?.status === "ok" ? (
                <span className="text-primary font-medium">Online</span>
              ) : (
                <span className="text-destructive font-medium">Offline</span>
              )}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {isOffline && (
          <div className="bg-accent text-accent-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium sticky top-0 z-30 shadow-sm">
            <WifiOff className="w-4 h-4" />
            Offline Mode — Saving locally
          </div>
        )}
        <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
