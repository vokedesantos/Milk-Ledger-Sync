import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateRecord,
  useListRecords,
  useListContacts,
  CreateRecordBodyType,
} from "@workspace/api-client-react";
import { saveLocalRecord } from "@/lib/db";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, ArrowLeft, Phone } from "lucide-react";

const formSchema = z.object({
  contactId: z.string().optional(),
  personName: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  amountLitres: z.coerce.number().positive("Must be greater than 0"),
  pricePerLitre: z.coerce.number().positive("Must be greater than 0"),
  date: z.string(),
});

export default function CustomerSale() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [lastRecord, setLastRecord] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateRecord();
  const { data: records, isLoading } = useListRecords({ type: "customer" });
  const { data: customerContacts } = useListContacts({ type: "customer" });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactId: "",
      personName: "",
      phone: "",
      amountLitres: 0,
      pricePerLitre: 65,
      date: new Date().toISOString().split("T")[0],
    },
  });

  const amount = form.watch("amountLitres");
  const price = form.watch("pricePerLitre");
  const total = (amount || 0) * (price || 0);

  const handleContactSelect = (id: string) => {
    if (id === "manual") {
      form.setValue("personName", "");
      form.setValue("phone", "");
      return;
    }
    const contact = customerContacts?.find((c) => String(c.id) === id);
    if (contact) {
      form.setValue("personName", contact.name);
      form.setValue("phone", contact.phone ?? "");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const recordData = {
      type: CreateRecordBodyType.customer,
      personName: values.personName,
      phone: values.phone || undefined,
      date: values.date,
      amountLitres: values.amountLitres,
      pricePerLitre: values.pricePerLitre,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    try {
      await saveLocalRecord(recordData);

      if (navigator.onLine) {
        await createMutation.mutateAsync({ data: recordData });
      }

      toast({
        title: "Sale recorded",
        description: `Sold ${values.amountLitres}L to ${values.personName}`,
      });

      setLastRecord({ ...recordData, totalPrice: total });
      queryClient.invalidateQueries();
      form.reset({
        contactId: "",
        personName: "",
        phone: "",
        amountLitres: 0,
        pricePerLitre: form.getValues("pricePerLitre"),
        date: form.getValues("date"),
      });
      setIsFormOpen(false);
      setShowSmsDialog(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Error saving record",
        description: "Please try again.",
      });
    }
  };

  const handleSendSms = () => {
    if (!lastRecord) return;
    const phone = lastRecord.phone ? lastRecord.phone : "";
    const message = `Invoice: Sold ${lastRecord.amountLitres}L milk to ${lastRecord.personName} at KES ${lastRecord.pricePerLitre}/L. Amount Due: KES ${lastRecord.totalPrice}. Thank you!`;
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
    setShowSmsDialog(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Sell Milk
            </h1>
            <p className="text-muted-foreground mt-1">Record sales to customers or vendors.</p>
          </div>
          {!isFormOpen && (
            <Button
              onClick={() => setIsFormOpen(true)}
              className="w-full sm:w-auto shadow-sm bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="w-4 h-4 mr-2" /> New Sale
            </Button>
          )}
        </div>

        {isFormOpen ? (
          <Card className="border-accent shadow-md">
            <CardHeader className="bg-accent/5 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFormOpen(false)}
                  className="-ml-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <CardTitle>New Sales Record</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Contact picker */}
                  {customerContacts && customerContacts.length > 0 && (
                    <FormField
                      control={form.control}
                      name="contactId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Customer (optional)</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              field.onChange(v);
                              handleContactSelect(v);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Choose from contacts or enter manually" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="manual">Enter manually</SelectItem>
                              {customerContacts.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name}
                                  {c.phone ? ` — ${c.phone}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="personName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Cafe Local" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0712 345 678"
                              type="tel"
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amountLitres"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (Litres)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              {...field}
                              className="h-11 text-lg font-medium"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pricePerLitre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price (KES/L)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-accent/10 border border-accent/30 p-4 rounded-xl flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Total Receivable</span>
                    <span className="text-2xl font-bold text-foreground">
                      KES {total.toLocaleString()}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    )}
                    Record Sale
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-card-border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium text-right">Litres</th>
                    <th className="px-4 py-3 font-medium text-right">Total (KES)</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </td>
                    </tr>
                  ) : records?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        No sales records yet.
                      </td>
                    </tr>
                  ) : (
                    records?.map((record) => (
                      <tr
                        key={record.id || record.localId}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap font-medium">
                          {format(new Date(record.date), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{record.personName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {record.phone ? (
                            <a
                              href={`tel:${record.phone}`}
                              className="text-primary flex items-center gap-1 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {record.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                          {record.amountLitres}L
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-semibold">
                          {record.totalPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              record.synced
                                ? "bg-primary/10 text-primary"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {record.synced ? "Synced" : "Local"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <AlertDialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send SMS Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                Send a text message invoice to{" "}
                <strong>{lastRecord?.personName}</strong>
                {lastRecord?.phone && ` (${lastRecord.phone})`}?
                <div className="mt-3 p-3 bg-muted rounded-md text-sm text-foreground italic border border-border">
                  "Invoice: Sold {lastRecord?.amountLitres}L milk to {lastRecord?.personName} at
                  KES {lastRecord?.pricePerLitre}/L. Amount Due: KES {lastRecord?.totalPrice}.
                  Thank you!"
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Skip</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSendSms}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Open SMS App
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
