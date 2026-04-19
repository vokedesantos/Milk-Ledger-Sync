import { useGetDashboardStats, useListRecords, useGetRecentActivity } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Wallet, TrendingUp, ArrowRightLeft, FileText } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: recentRecords } = useGetRecentActivity({ limit: 5 });

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Moscat Dairy</h1>
          <p className="text-muted-foreground mt-1">Overview of collections and sales.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-card-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats?.netBalance || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total margin
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-card-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Milk Collected</CardTitle>
              <Droplet className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.farmerTotalLitres || 0} L
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {stats?.farmerRecordCount || 0} farmers
              </p>
            </CardContent>
          </Card>

          <Card className="border-card-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Milk Sold</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.customerTotalLitres || 0} L
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                To {stats?.customerRecordCount || 0} customers
              </p>
            </CardContent>
          </Card>

          <Card className="border-card-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Activity</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats?.totalRecords || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Transactions today
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
          <Card className="border-card-border shadow-sm overflow-hidden">
            {recentRecords && recentRecords.length > 0 ? (
              <div className="divide-y divide-border">
                {recentRecords.map((record) => (
                  <div key={record.id || record.localId} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        record.type === 'farmer' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'
                      }`}>
                        {record.personName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{record.personName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.date), "MMM d, h:mm a")} • {record.type === 'farmer' ? 'Collection' : 'Sale'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{record.amountLitres} L</p>
                      <p className="text-xs font-semibold" style={{ color: record.type === 'farmer' ? 'var(--destructive)' : 'hsl(var(--primary))' }}>
                        {record.type === 'farmer' ? '-' : '+'}{formatCurrency(record.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>No recent activity</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
