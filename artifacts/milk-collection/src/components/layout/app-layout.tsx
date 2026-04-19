import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  WifiOff,
  LayoutDashboard,
  BookUser,
  ScrollText,
  Menu,
  X,
  Server,
  PlusCircle,
  Milk,
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
        toast({ title: "Back online", description: `Syncing ${unsynced.length} records...` });
        try {
          await syncMutation.mutateAsync({ data: { records: unsynced } });
          await markRecordsSynced(unsynced.map((r) => r.localId));
          queryClient.invalidateQueries();
          toast({ title: "Sync complete", description: "All records are now backed up." });
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
    { href: "/", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: "/entry", label: "New Entry", icon: <PlusCircle className="w-5 h-5" /> },
    { href: "/contacts", label: "Contacts", icon: <BookUser className="w-5 h-5" /> },
    { href: "/records", label: "All Records", icon: <ScrollText className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Milk className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Moscat Dairy</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-primary-foreground hover:bg-white/10 w-9 h-9"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          ${isSidebarOpen ? "flex" : "hidden"}
          md:flex flex-col w-full md:w-64 bg-sidebar border-r border-sidebar-border
          fixed md:sticky top-[52px] md:top-0 h-[calc(100dvh-52px)] md:h-[100dvh] z-40
        `}
      >
        {/* Desktop logo */}
        <div className="p-5 hidden md:flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-sm">
            <Milk className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground leading-tight">
              Moscat Dairy
            </h1>
            <p className="text-xs text-muted-foreground">Milk collection system</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm
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
          <div
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              health?.status === "ok"
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span className="font-medium">
              Server {health?.status === "ok" ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {isOffline && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium sticky top-0 z-30">
            <WifiOff className="w-4 h-4" />
            Offline — saving locally
          </div>
        )}
        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto w-full">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex z-40 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold tracking-wide transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-primary/10" : ""}`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
