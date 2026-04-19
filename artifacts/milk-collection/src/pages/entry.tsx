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
import {
  Loader2,
  Plus,
  ArrowLeft,
  Phone,
  User,
  CalendarDays,
  Droplets,
  Tag,
  Truck,
  ShoppingCart,
  ChevronRight,
} from "lucide-react";

const formSchema = z.object({
  contactId: z.string().optional(),
  personName: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  amountLitres: z.coerce.number().positive("Must be greater than 0"),
  pricePerLitre: z.coerce.number().positive("Must be greater than 0"),
  date: z.string(),
});

type RecordType = "farmer" | "customer";

const TYPE_CONFIG = {
  farmer: {
    label: "Farmer",
    sublabel: "Collect milk",
    icon: Truck,
    color: "bg-primary",
    lightBg: "bg-primary/8",
    border: "border-primary/30",
    namePlaceholder: "e.g. John Kamau",
    nameLabel: "Farmer Name",
    actionLabel: "Save Collection",
    smsTitle: "Send SMS Receipt?",
    smsDesc: (name: string, phone: string) =>
      `Send a receipt to ${name}${phone ? ` (${phone})` : ""}?`,
    smsMsg: (r: any) =>
      `Received ${r.amountLitres}L from ${r.personName} at KES ${r.pricePerLitre}/L. Total: KES ${r.totalPrice}. Thank you!`,
    defaultPrice: 50,
  },
  customer: {
    label: "Customer",
    sublabel: "Sell milk",
    icon: ShoppingCart,
    color: "bg-amber-600",
    lightBg: "bg-amber-50",
    border: "border-amber-200",
    namePlaceholder: "e.g. Cafe Local",
    nameLabel: "Customer Name",
    actionLabel: "Save Sale",
    smsTitle: "Send SMS Invoice?",
    smsDesc: (name: string, phone: string) =>
      `Send an invoice to ${name}${phone ? ` (${phone})` : ""}?`,
    smsMsg: (r: any) =>
      `Invoice: Sold ${r.amountLitres}L to ${r.personName} at KES ${r.pricePerLitre}/L. Amount Due: KES ${r.totalPrice}. Thank you!`,
    defaultPrice: 65,
  },
};

function RecordRow({ record }: { record: any }) {
  const cfg = TYPE_CONFIG[record.type as RecordType];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-border last:border-0">
      <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{record.personName}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(record.date), "MMM d, yyyy")} · {record.amountLitres}L
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-foreground text-sm">KES {record.totalPrice.toLocaleString()}</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            record.synced ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"
          }`}
        >
          {record.synced ? "Synced" : "Local"}
        </span>
      </div>
    </div>
  );
}

export default function Entry() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>("customer");
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [lastRecord, setLastRecord] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateRecord();
  const { data: allRecords, isLoading } = useListRecords({});
  const { data: farmerContacts } = useListContacts({ type: "farmer" });
  const { data: customerContacts } = useListContacts({ type: "customer" });

  const cfg = TYPE_CONFIG[recordType];
  const contacts = recordType === "farmer" ? farmerContacts : customerContacts;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactId: "",
      personName: "",
      phone: "",
      amountLitres: 0,
      pricePerLitre: cfg.defaultPrice,
      date: new Date().toISOString().split("T")[0],
    },
  });

  const amount = form.watch("amountLitres");
  const price = form.watch("pricePerLitre");
  const total = (amount || 0) * (price || 0);

  const handleTypeChange = (type: RecordType) => {
    setRecordType(type);
    form.setValue("contactId", "");
    form.setValue("personName", "");
    form.setValue("phone", "");
    form.setValue("pricePerLitre", TYPE_CONFIG[type].defaultPrice);
  };

  const handleContactSelect = (id: string) => {
    if (id === "manual") {
      form.setValue("personName", "");
      form.setValue("phone", "");
      return;
    }
    const contact = contacts?.find((c) => String(c.id) === id);
    if (contact) {
      form.setValue("personName", contact.name);
      form.setValue("phone", contact.phone ?? "");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const recordData = {
      type: recordType === "farmer" ? CreateRecordBodyType.farmer : CreateRecordBodyType.customer,
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
      toast({ title: "Record saved", description: `${values.amountLitres}L · ${values.personName}` });
      setLastRecord({ ...recordData, totalPrice: total });
      queryClient.invalidateQueries();
      form.reset({
        contactId: "",
        personName: "",
        phone: "",
        amountLitres: 0,
        pricePerLitre: cfg.defaultPrice,
        date: form.getValues("date"),
      });
      setIsFormOpen(false);
      setShowSmsDialog(true);
    } catch {
      toast({ variant: "destructive", title: "Error saving record" });
    }
  };

  const handleSendSms = () => {
    if (!lastRecord) return;
    const phone = lastRecord.phone ?? "";
    const cfgLast = TYPE_CONFIG[lastRecord.type as RecordType];
    window.location.href = `sms:${phone}?body=${encodeURIComponent(cfgLast.smsMsg(lastRecord))}`;
    setShowSmsDialog(false);
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Record Entry</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Capture milk transactions</p>
          </div>
          {!isFormOpen && (
            <Button
              onClick={() => setIsFormOpen(true)}
              className="rounded-2xl h-11 px-5 shadow-sm gap-2"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </Button>
          )}
        </div>

        {/* Form */}
        {isFormOpen && (
          <Card className="rounded-3xl border-0 shadow-lg overflow-hidden">
            {/* Type toggle */}
            <div className="grid grid-cols-2 bg-muted/40">
              {(["customer", "farmer"] as RecordType[]).map((t) => {
                const c = TYPE_CONFIG[t];
                const Icon = c.icon;
                const active = recordType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all ${
                      active
                        ? "bg-white shadow-sm text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {c.label}
                  </button>
                );
              })}
            </div>

            <CardContent className="pt-5 pb-6 px-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Contact picker */}
                  {contacts && contacts.length > 0 && (
                    <FormField
                      control={form.control}
                      name="contactId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Select from Contacts
                          </FormLabel>
                          <Select
                            onValueChange={(v) => { field.onChange(v); handleContactSelect(v); }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl border-border/60 bg-muted/30">
                                <SelectValue placeholder="Choose a contact or enter manually" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="manual">Enter manually</SelectItem>
                              {contacts.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name}{c.phone ? ` · ${c.phone}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="personName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {cfg.nameLabel}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder={cfg.namePlaceholder}
                              {...field}
                              className="h-12 pl-10 rounded-xl border-border/60 bg-muted/30"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="0712 345 678"
                              type="tel"
                              {...field}
                              className="h-12 pl-10 rounded-xl border-border/60 bg-muted/30"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Date
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="date"
                              {...field}
                              className="h-12 pl-10 rounded-xl border-border/60 bg-muted/30"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Amount + Price row */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="amountLitres"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Litres
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                className="h-12 pl-9 rounded-xl border-border/60 bg-muted/30 text-base font-medium"
                              />
                            </div>
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
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Price / L
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.5"
                                {...field}
                                className="h-12 pl-9 rounded-xl border-border/60 bg-muted/30"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Total */}
                  <div className="bg-primary/8 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Total Amount
                      </p>
                      <p className="text-2xl font-bold text-primary mt-0.5">
                        KES {total.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center">
                      {recordType === "customer" ? (
                        <ShoppingCart className="w-6 h-6 text-primary" />
                      ) : (
                        <Truck className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                      className="h-12 rounded-xl flex-none"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-12 rounded-xl text-base font-semibold"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {cfg.actionLabel}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Recent Records */}
        {!isFormOpen && (
          <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !allRecords?.length ? (
                <div className="py-12 text-center text-muted-foreground px-6">
                  <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Droplets className="w-7 h-7 opacity-40" />
                  </div>
                  <p className="font-medium">No records yet</p>
                  <p className="text-sm mt-1">Tap "New Entry" to get started</p>
                </div>
              ) : (
                allRecords.slice(0, 20).map((record) => (
                  <RecordRow key={record.id || record.localId} record={record} />
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* SMS Dialog */}
      <AlertDialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lastRecord && TYPE_CONFIG[lastRecord.type as RecordType].smsTitle}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  {lastRecord &&
                    TYPE_CONFIG[lastRecord.type as RecordType].smsDesc(
                      lastRecord.personName,
                      lastRecord.phone ?? ""
                    )}
                </p>
                <div className="mt-3 p-3 bg-muted rounded-xl text-sm text-foreground italic border border-border">
                  {lastRecord && TYPE_CONFIG[lastRecord.type as RecordType].smsMsg(lastRecord)}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Skip</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendSms} className="rounded-xl">
              Open SMS App
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
