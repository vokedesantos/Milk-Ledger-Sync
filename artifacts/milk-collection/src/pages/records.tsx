import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useListRecords, ListRecordsType } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Filter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Records() {
  const [filter, setFilter] = useState<ListRecordsType | "all">("all");
  
  const { data: records, isLoading } = useListRecords(
    filter !== "all" ? { type: filter as ListRecordsType } : undefined
  );

  const exportPDF = () => {
    if (!records || records.length === 0) return;
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("MilkSys Records Ledger", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, 14, 30);
    
    const tableData = records.map(r => [
      format(new Date(r.date), "MMM d, yyyy"),
      r.type === 'farmer' ? 'Collection' : 'Sale',
      r.personName,
      `${r.amountLitres} L`,
      `KES ${r.pricePerLitre}`,
      `KES ${r.totalPrice.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Type', 'Name', 'Amount', 'Price/L', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [38, 89, 59] }, // Brand primary color
      foot: [['', '', 'TOTAL', 
        `${records.reduce((sum, r) => sum + r.amountLitres, 0).toFixed(1)} L`, 
        '', 
        `KES ${records.reduce((sum, r) => sum + (r.type === 'farmer' ? -r.totalPrice : r.totalPrice), 0).toLocaleString()}`
      ]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`milksys-records-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Ledger Book</h1>
            <p className="text-muted-foreground mt-1">All historical records and exports.</p>
          </div>
          <Button onClick={exportPDF} disabled={!records || records.length === 0} className="w-full sm:w-auto shadow-sm">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            onClick={() => setFilter("all")}
            size="sm"
            className={filter === "all" ? "shadow-sm" : ""}
          >
            All Records
          </Button>
          <Button 
            variant={filter === "farmer" ? "default" : "outline"} 
            onClick={() => setFilter("farmer")}
            size="sm"
            className={filter === "farmer" ? "shadow-sm bg-primary text-primary-foreground" : ""}
          >
            Collections (In)
          </Button>
          <Button 
            variant={filter === "customer" ? "default" : "outline"} 
            onClick={() => setFilter("customer")}
            size="sm"
            className={filter === "customer" ? "shadow-sm bg-accent text-accent-foreground" : ""}
          >
            Sales (Out)
          </Button>
        </div>

        <Card className="border-card-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium text-right">Litres</th>
                  <th className="px-6 py-4 font-medium text-right">Price/L</th>
                  <th className="px-6 py-4 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : records?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                      <Filter className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      No records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  records?.map((record) => (
                    <tr key={record.id || record.localId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-foreground font-medium">
                        {format(new Date(record.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          record.type === 'farmer' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'
                        }`}>
                          {record.type === 'farmer' ? 'Collection' : 'Sale'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-foreground">
                        {record.personName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                        {record.amountLitres}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">
                        {record.pricePerLitre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold" style={{ color: record.type === 'farmer' ? 'var(--destructive)' : 'hsl(var(--primary))' }}>
                        {record.type === 'farmer' ? '-' : '+'}{record.totalPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
