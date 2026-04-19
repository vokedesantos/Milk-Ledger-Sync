import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useListRecords } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  FileSpreadsheet,
  MessageSquare,
  Truck,
  ShoppingCart,
  LayoutList,
  Phone,
  CalendarDays,
  Copy,
  Check,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FilterType = "all" | "farmer" | "customer";

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) =>
      r.map((cell) => (cell.includes(",") || cell.includes("\n") ? `"${cell}"` : cell)).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export default function Records() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [summaryText, setSummaryText] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: allData, isLoading } = useListRecords({});

  const weekStart = startOfDay(subDays(new Date(), 6));
  const weekEnd = endOfDay(new Date());

  const weeklyRecords = useMemo(() => {
    if (!allData) return [];
    return allData.filter((r) =>
      isWithinInterval(parseISO(r.date), { start: weekStart, end: weekEnd })
    );
  }, [allData]);

  const displayRecords = useMemo(() => {
    const base = allData ?? [];
    if (filter === "all") return base;
    return base.filter((r) => r.type === filter);
  }, [allData, filter]);

  const weeklyFarmers = weeklyRecords.filter((r) => r.type === "farmer");
  const weeklyCustomers = weeklyRecords.filter((r) => r.type === "customer");

  // ── Farmer CSV export ────────────────────────────────────────────────────
  const exportFarmerCSV = () => {
    const dateLabel = `${format(weekStart, "MMM d")} - ${format(new Date(), "MMM d, yyyy")}`;
    const header = ["Farmer Name", "Phone", "Region", "Date", "Litres (L)", "Price/L (KES)", "Total (KES)"];

    const rows = weeklyFarmers.map((r) => [
      r.personName,
      (r as any).phone ?? "",
      (r as any).region ?? "",
      format(parseISO(r.date), "MMM d, yyyy"),
      String(r.amountLitres),
      String(r.pricePerLitre),
      String(r.totalPrice),
    ]);

    // Group totals by farmer
    const byFarmer = groupBy(weeklyFarmers, (r) => r.personName);
    const farmerTotals = Object.entries(byFarmer).map(([name, recs]) => [
      `TOTAL — ${name}`,
      "",
      "",
      "",
      String(recs.reduce((s, r) => s + r.amountLitres, 0)),
      "",
      String(recs.reduce((s, r) => s + r.totalPrice, 0)),
    ]);

    const grandLitres = weeklyFarmers.reduce((s, r) => s + r.amountLitres, 0);
    const grandTotal = weeklyFarmers.reduce((s, r) => s + r.totalPrice, 0);
    const grandRow = [
      "GRAND TOTAL — ALL FARMERS",
      "",
      "",
      "",
      String(grandLitres),
      "",
      String(grandTotal),
    ];

    const allRows = [
      [`Moscat Dairy — Farmer Report (${dateLabel})`],
      [],
      header,
      ...rows,
      [],
      ...farmerTotals,
      [],
      grandRow,
    ];

    downloadCSV(`moscat-farmers-${format(new Date(), "yyyy-MM-dd")}.csv`, allRows);
  };

  // ── Customer CSV export ──────────────────────────────────────────────────
  const exportCustomerCSV = () => {
    const dateLabel = `${format(weekStart, "MMM d")} - ${format(new Date(), "MMM d, yyyy")}`;
    const header = [
      "Customer Name",
      "Phone",
      "Region",
      "Date",
      "Litres (L)",
      "Price/L (KES)",
      "Total (KES)",
      "Paid?",
    ];

    const rows = weeklyCustomers.map((r) => [
      r.personName,
      (r as any).phone ?? "",
      (r as any).region ?? "",
      format(parseISO(r.date), "MMM d, yyyy"),
      String(r.amountLitres),
      String(r.pricePerLitre),
      String(r.totalPrice),
      "",
    ]);

    const grandLitres = weeklyCustomers.reduce((s, r) => s + r.amountLitres, 0);
    const grandTotal = weeklyCustomers.reduce((s, r) => s + r.totalPrice, 0);
    const grandRow = ["GRAND TOTAL", "", "", "", String(grandLitres), "", String(grandTotal), ""];

    const allRows = [
      [`Moscat Dairy — Customer Report (${dateLabel})`],
      [],
      header,
      ...rows,
      [],
      grandRow,
    ];

    downloadCSV(`moscat-customers-${format(new Date(), "yyyy-MM-dd")}.csv`, allRows);
  };

  // ── Weekly farmer SMS summary ────────────────────────────────────────────
  const generateWeeklySummary = () => {
    const dateLabel = `${format(weekStart, "MMM d")} - ${format(new Date(), "MMM d, yyyy")}`;
    const byFarmer = groupBy(weeklyFarmers, (r) => r.personName);

    const lines = [
      `Moscat Dairy Weekly Report (${dateLabel}):`,
      ``,
      `Farmers:`,
      ...Object.entries(byFarmer).map(([name, recs]) => {
        const litres = recs.reduce((s, r) => s + r.amountLitres, 0);
        const total = recs.reduce((s, r) => s + r.totalPrice, 0);
        return `  • ${name}: ${litres}L — KES ${total.toLocaleString()}`;
      }),
      ``,
      `Total Milk Collected: ${weeklyFarmers.reduce((s, r) => s + r.amountLitres, 0)}L`,
      `Grand Total Paid: KES ${weeklyFarmers.reduce((s, r) => s + r.totalPrice, 0).toLocaleString()}`,
    ];

    setSummaryText(lines.join("\n"));
    setShowSummary(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendSMS = () => {
    window.location.href = `sms:?body=${encodeURIComponent(summaryText)}`;
  };

  const tabs: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <LayoutList className="w-4 h-4" /> },
    { key: "farmer", label: "Farmers", icon: <Truck className="w-4 h-4" /> },
    { key: "customer", label: "Customers", icon: <ShoppingCart className="w-4 h-4" /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Records</h1>
          <p className="text-muted-foreground text-sm mt-0.5">All transactions and weekly exports.</p>
        </div>

        {/* Weekly Export Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Farmer export */}
          <Card className="rounded-2xl border-0 shadow-sm bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Farmer Report</p>
                  <p className="text-xs text-muted-foreground">
                    {weeklyFarmers.length} entries · last 7 days
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs h-9 gap-1.5"
                  onClick={exportFarmerCSV}
                  disabled={weeklyFarmers.length === 0}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs h-9 gap-1.5"
                  onClick={generateWeeklySummary}
                  disabled={weeklyFarmers.length === 0}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Summary
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer export */}
          <Card className="rounded-2xl border-0 shadow-sm bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Customer Report</p>
                  <p className="text-xs text-muted-foreground">
                    {weeklyCustomers.length} entries · last 7 days
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-xl text-xs h-9 gap-1.5"
                onClick={exportCustomerCSV}
                disabled={weeklyCustomers.length === 0}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export CSV (with Paid? column)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-muted/50 p-1 rounded-2xl gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                filter === t.key
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Records table */}
        <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayRecords.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <LayoutList className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium text-right">Litres</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayRecords.map((record) => (
                    <tr
                      key={record.id || record.localId}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                        {format(parseISO(record.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                            record.type === "farmer"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {record.type === "farmer" ? (
                            <Truck className="w-3 h-3" />
                          ) : (
                            <ShoppingCart className="w-3 h-3" />
                          )}
                          {record.type === "farmer" ? "Farmer" : "Customer"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-foreground">
                        {record.personName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {(record as any).phone ? (
                          <a
                            href={`tel:${(record as any).phone}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {(record as any).phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                        {record.amountLitres}L
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-right font-semibold ${
                          record.type === "farmer" ? "text-destructive" : "text-primary"
                        }`}
                      >
                        {record.type === "farmer" ? "-" : "+"}
                        {record.totalPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {displayRecords.length > 0 && (
                  <tfoot className="bg-muted/50 font-semibold text-sm">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-muted-foreground">
                        Total ({displayRecords.length} records)
                      </td>
                      <td className="px-4 py-3 text-right">
                        {displayRecords.reduce((s, r) => s + r.amountLitres, 0).toFixed(1)}L
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        KES{" "}
                        {displayRecords
                          .reduce((s, r) => s + r.totalPrice, 0)
                          .toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Weekly Summary Dialog */}
      <AlertDialog open={showSummary} onOpenChange={setShowSummary}>
        <AlertDialogContent className="rounded-3xl max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Weekly Farmer Summary
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <pre className="mt-3 p-4 bg-muted rounded-2xl text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed border border-border">
                  {summaryText}
                </pre>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl">Close</AlertDialogCancel>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button className="rounded-xl gap-2" onClick={handleSendSMS}>
              <MessageSquare className="w-4 h-4" />
              Send SMS
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
