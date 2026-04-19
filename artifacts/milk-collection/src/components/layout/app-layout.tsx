import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  WifiOff,
  LayoutDashboard,
  BookUser,
  ScrollText,
  Menu,
  X,
  PlusCircle,
  Milk,
  Wifi,
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
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/entry", label: "New Entry", icon: PlusCircle },
    { href: "/contacts", label: "Contacts", icon: BookUser },
    { href: "/records", label: "Records", icon: ScrollText },
  ];

  const isOnline = health?.status === "ok";

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-600 shadow-lg shadow-emerald-900/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-inner">
            <Milk className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">Moscat Dairy</h1>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-300" : "bg-red-400"}`} />
              <span className="text-[10px] text-white/70">{isOnline ? "Online" : "Offline"}</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white hover:bg-white/10 w-9 h-9 rounded-xl"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30 top-[52px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isSidebarOpen ? "flex" : "hidden"}
          md:flex flex-col w-72 md:w-64
          bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900
          fixed md:sticky top-[52px] md:top-0 h-[calc(100dvh-52px)] md:h-[100dvh] z-40
          shadow-2xl shadow-emerald-900/40
        `}
      >
        {/* Desktop logo */}
        <div className="p-5 hidden md:block border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner border border-white/10">
              <Milk className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-tight">Moscat Dairy</h1>
              <p className="text-xs text-emerald-300/80">Milk collection system</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all
                  ${isActive
                    ? "bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/10"
                    : "text-emerald-100/70 hover:bg-white/10 hover:text-white"
                  }
                `}
                onClick={() => setIsSidebarOpen(false)}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? "bg-white/20" : "bg-transparent"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
            isOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            Server {isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {isOffline && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold sticky top-0 z-30 shadow-lg">
            <WifiOff className="w-4 h-4" />
            Offline — saving locally, will sync when reconnected
          </div>
        )}
        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-white/90 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] flex">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold tracking-wide transition-colors ${
                  isActive ? "text-emerald-700" : "text-muted-foreground"
                }`}
              >
                <div className={`p-1.5 rounded-2xl transition-all ${isActive ? "bg-emerald-100 shadow-sm" : ""}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-emerald-700" : ""}`} />
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
