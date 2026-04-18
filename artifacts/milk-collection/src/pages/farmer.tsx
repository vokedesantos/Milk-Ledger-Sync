import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateRecord, useListRecords, CreateRecordBodyType } from "@workspace/api-client-react";
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
import { Loader2, Plus, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  personName: z.string().min(2, "Name is required"),
  amountLitres: z.coerce.number().positive("Must be greater than 0"),
  pricePerLitre: z.coerce.number().positive("Must be greater than 0"),
  date: z.string(),
});

export default function FarmerCollection() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [lastRecord, setLastRecord] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateRecord();
  const { data: records, isLoading } = useListRecords({ type: "farmer" });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personName: "",
      amountLitres: 0,
      pricePerLitre: 50, // Default typical buying price
      date: new Date().toISOString().split('T')[0], // Today
    },
  });

  const amount = form.watch("amountLitres");
  const price = form.watch("pricePerLitre");
  const total = (amount || 0) * (price || 0);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const recordData = {
      ...values,
      type: CreateRecordBodyType.farmer,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    try {
      // Always save to IndexedDB first
      await saveLocalRecord(recordData);
      
      if (navigator.onLine) {
        await createMutation.mutateAsync({ data: recordData });
      }
      
      toast({
        title: "Record saved",
        description: `Successfully recorded ${values.amountLitres}L from ${values.personName}`,
      });
      
      setLastRecord({ ...recordData, totalPrice: total });
      queryClient.invalidateQueries();
      form.reset({ ...form.getValues(), personName: "", amountLitres: 0 }); // keep date and price
      setIsFormOpen(false);
      setShowSmsDialog(true);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving record",
        description: "Please try again.",
      });
    }
  };

  const handleSendSms = () => {
    if (!lastRecord) return;
    const message = `Received ${lastRecord.amountLitres}L from ${lastRecord.personName} at KES ${lastRecord.pricePerLitre}/L. Total: KES ${lastRecord.totalPrice}. Thanks for delivering!`;
    window.location.href = `sms:?body=${encodeURIComponent(message)}`;
    setShowSmsDialog(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Collect Milk</h1>
            <p className="text-muted-foreground mt-1">Receive milk from farmers.</p>
          </div>
          {!isFormOpen && (
            <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> New Collection
            </Button>
          )}
        </div>

        {isFormOpen ? (
          <Card className="border-primary-border shadow-md">
            <CardHeader className="bg-primary/5 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)} className="-ml-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <CardTitle>New Collection Record</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="personName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Farmer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} className="h-12" />
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
                            <Input type="date" {...field} className="h-12" />
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
                            <Input type="number" step="0.1" {...field} className="h-12 text-lg font-medium" />
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
                          <FormLabel>Price per Litre (KES)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" {...field} className="h-12" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-muted p-4 rounded-xl flex justify-between items-center mt-6">
                    <span className="text-muted-foreground font-medium">Total Amount</span>
                    <span className="text-2xl font-bold text-foreground">KES {total.toLocaleString()}</span>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" className="flex-1 h-12 text-lg" disabled={createMutation.isPending}>
                      {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      Save Record
                    </Button>
                  </div>
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
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Farmer</th>
                    <th className="px-6 py-4 font-medium text-right">Litres</th>
                    <th className="px-6 py-4 font-medium text-right">Price/L</th>
                    <th className="px-6 py-4 font-medium text-right">Total</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </td>
                    </tr>
                  ) : records?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        No collection records found.
                      </td>
                    </tr>
                  ) : (
                    records?.map((record) => (
                      <tr key={record.id || record.localId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-foreground font-medium">
                          {format(new Date(record.date), "MMM d, yyyy")}
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
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-foreground">
                          {record.totalPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {record.synced ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              Synced
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent-foreground">
                              Local
                            </span>
                          )}
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
              <AlertDialogTitle>Send SMS Receipt?</AlertDialogTitle>
              <AlertDialogDescription>
                Do you want to send a text message receipt to {lastRecord?.personName}?
                <div className="mt-4 p-3 bg-muted rounded-md text-sm text-foreground italic border border-border">
                  "Received {lastRecord?.amountLitres}L from {lastRecord?.personName} at KES {lastRecord?.pricePerLitre}/L. Total: KES {lastRecord?.totalPrice}. Thanks for delivering!"
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Skip</AlertDialogCancel>
              <AlertDialogAction onClick={handleSendSms} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Open SMS App
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
