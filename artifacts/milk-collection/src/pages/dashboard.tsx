import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Droplets,
  Wallet,
  TrendingUp,
  ArrowRightLeft,
  Truck,
  ShoppingCart,
  MapPin,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const statCards = [
  {
    key: "net",
    label: "Net Balance",
    gradient: "from-violet-600 to-purple-700",
    icon: Wallet,
    shadowColor: "shadow-violet-200",
  },
  {
    key: "collected",
    label: "Milk Collected",
    gradient: "from-emerald-500 to-teal-600",
    icon: Droplets,
    shadowColor: "shadow-emerald-200",
  },
  {
    key: "sold",
    label: "Milk Sold",
    gradient: "from-amber-500 to-orange-600",
    icon: TrendingUp,
    shadowColor: "shadow-amber-200",
  },
  {
    key: "total",
    label: "Total Records",
    gradient: "from-sky-500 to-blue-600",
    icon: ArrowRightLeft,
    shadowColor: "shadow-sky-200",
  },
];

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: recentRecords } = useGetRecentActivity({ limit: 8 });

  const values: Record<string, string> = {
    net: `KES ${(stats?.netBalance || 0).toLocaleString()}`,
    collected: `${stats?.farmerTotalLitres || 0} L`,
    sold: `${stats?.customerTotalLitres || 0} L`,
    total: String(stats?.totalRecords || 0),
  };
  const subs: Record<string, string> = {
    net: "Total margin",
    collected: `From ${stats?.farmerRecordCount || 0} farmers`,
    sold: `To ${stats?.customerRecordCount || 0} customers`,
    total: "Transactions",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
            Moscat Dairy
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Overview of collections and sales.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.key}
                className={`rounded-3xl border-0 shadow-xl ${card.shadowColor} overflow-hidden hover:-translate-y-0.5 transition-transform`}
              >
                <div className={`bg-gradient-to-br ${card.gradient} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                      {card.label}
                    </p>
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="h-8 bg-white/20 rounded-xl animate-pulse" />
                  ) : (
                    <>
                      <p className="text-2xl font-black text-white leading-tight">
                        {values[card.key]}
                      </p>
                      <p className="text-white/70 text-xs mt-1">{subs[card.key]}</p>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card className="rounded-3xl border-0 shadow-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Recent Activity</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Last 8
            </span>
          </div>
          {!recentRecords?.length ? (
            <div className="py-12 text-center text-muted-foreground px-6 pb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ArrowRightLeft className="w-6 h-6 opacity-30" />
              </div>
              <p className="font-medium">No recent activity</p>
            </div>
          ) : (
            <div className="pb-2">
              {recentRecords.map((record) => {
                const isFarmer = record.type === "farmer";
                const Icon = isFarmer ? Truck : ShoppingCart;
                const gradient = isFarmer
                  ? "from-emerald-500 to-teal-600"
                  : "from-amber-500 to-orange-600";
                return (
                  <div
                    key={record.id || record.localId}
                    className="flex items-center gap-3 px-5 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {record.personName}
                        </p>
                        {(record as any).region && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                            <MapPin className="w-2.5 h-2.5" />
                            {(record as any).region}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(record.date), "MMM d, yyyy")} ·{" "}
                        {isFarmer ? "Collection" : "Sale"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-bold text-sm ${isFarmer ? "text-destructive" : "text-emerald-600"}`}
                      >
                        {isFarmer ? "-" : "+"}KES {record.totalPrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{record.amountLitres}L</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
