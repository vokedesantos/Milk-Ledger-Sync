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
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
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
  Phone,
  User,
  CalendarDays,
  Droplets,
  Tag,
  Truck,
  ShoppingCart,
  MapPin,
  X,
} from "lucide-react";

const formSchema = z.object({
  contactId: z.string().optional(),
  personName: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  region: z.string().optional(),
  amountLitres: z.coerce.number().positive("Must be greater than 0"),
  pricePerLitre: z.coerce.number().positive("Must be greater than 0"),
  date: z.string(),
});

type RecordType = "farmer" | "customer";

const TYPE_CONFIG = {
  farmer: {
    label: "Farmer",
    sublabel: "Milk collection",
    icon: Truck,
    gradient: "from-emerald-600 to-teal-700",
    softBg: "bg-emerald-50",
    namePlaceholder: "e.g. John Kamau",
    nameLabel: "Farmer Name",
    actionLabel: "Save Collection",
    smsTitle: "Send SMS Receipt?",
    smsDesc: (name: string, phone: string) =>
      `Send a receipt to ${name}${phone ? ` (${phone})` : ""}?`,
    smsMsg: (r: any) =>
      `Dear ${r.personName}, ${r.amountLitres}L of milk has been collected on ${r.date} at KES ${r.pricePerLitre}/L. Total: KES ${r.totalPrice}. Thank you!`,
    defaultPrice: 50,
  },
  customer: {
    label: "Customer",
    sublabel: "Milk sale",
    icon: ShoppingCart,
    gradient: "from-amber-500 to-orange-600",
    softBg: "bg-amber-50",
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
    <div className="flex items-center gap-3 py-3 px-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
      <div
        className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0 shadow-sm`}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground truncate text-sm">{record.personName}</p>
          {record.region && (
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
              <MapPin className="w-2.5 h-2.5" />
              {record.region}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(parseISO(record.date), "MMM d, yyyy")} · {record.amountLitres}L
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-foreground text-sm">KES {record.totalPrice.toLocaleString()}</p>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            record.synced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
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
      region: "",
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
    form.setValue("region", "");
    form.setValue("pricePerLitre", TYPE_CONFIG[type].defaultPrice);
  };

  const handleContactSelect = (id: string) => {
    if (id === "manual") {
      form.setValue("personName", "");
      form.setValue("phone", "");
      form.setValue("region", "");
      return;
    }
    const contact = contacts?.find((c) => String(c.id) === id);
    if (contact) {
      form.setValue("personName", contact.name);
      form.setValue("phone", (contact as any).phone ?? "");
      form.setValue("region", (contact as any).region ?? "");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const recordData = {
      type: recordType === "farmer" ? CreateRecordBodyType.farmer : CreateRecordBodyType.customer,
      personName: values.personName,
      phone: values.phone || undefined,
      region: values.region || undefined,
      date: values.date,
      amountLitres: values.amountLitres,
      pricePerLitre: values.pricePerLitre,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    try {
      await saveLocalRecord(recordData);
      if (navigator.onLine) await createMutation.mutateAsync({ data: recordData });
      toast({ title: "Record saved", description: `${values.amountLitres}L · ${values.personName}` });
      setLastRecord({ ...recordData, totalPrice: total });
      queryClient.invalidateQueries();
      form.reset({
        contactId: "", personName: "", phone: "", region: "",
        amountLitres: 0, pricePerLitre: cfg.defaultPrice, date: form.getValues("date"),
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">New Entry</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Capture milk transactions</p>
          </div>
          {!isFormOpen && (
            <Button
              onClick={() => setIsFormOpen(true)}
              className="rounded-2xl h-11 px-5 shadow-lg gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </Button>
          )}
        </div>

        {/* Form */}
        {isFormOpen && (
          <Card className="rounded-3xl border-0 shadow-2xl overflow-hidden">
            {/* Type toggle */}
            <div className="grid grid-cols-2">
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
                        ? `bg-gradient-to-r ${c.gradient} text-white shadow-md`
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
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
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Select from Contacts
                          </FormLabel>
                          <Select
                            onValueChange={(v) => { field.onChange(v); handleContactSelect(v); }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-2xl border-border/50 bg-muted/30 shadow-sm">
                                <SelectValue placeholder="Choose a contact or enter manually" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="manual">Enter manually</SelectItem>
                              {contacts.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name}
                                  {(c as any).region ? ` · ${(c as any).region}` : ""}
                                  {(c as any).phone ? ` · ${(c as any).phone}` : ""}
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {cfg.nameLabel}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder={cfg.namePlaceholder}
                              {...field}
                              className="h-12 pl-10 rounded-2xl border-border/50 bg-muted/30 shadow-sm focus:shadow-md transition-shadow"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone + Region row */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Phone
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="0712 345 678"
                                type="tel"
                                {...field}
                                className="h-12 pl-9 rounded-2xl border-border/50 bg-muted/30 shadow-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Region
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="e.g. Thika Town"
                                {...field}
                                className="h-12 pl-9 rounded-2xl border-border/50 bg-muted/30 shadow-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Date
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="date"
                              {...field}
                              className="h-12 pl-10 rounded-2xl border-border/50 bg-muted/30 shadow-sm"
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
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Litres
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                className="h-12 pl-9 rounded-2xl border-border/50 bg-muted/30 shadow-sm text-base font-semibold"
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
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Price / L
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.5"
                                {...field}
                                className="h-12 pl-9 rounded-2xl border-border/50 bg-muted/30 shadow-sm"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Total */}
                  <div
                    className={`bg-gradient-to-r ${cfg.gradient} rounded-3xl p-4 flex justify-between items-center shadow-lg`}
                  >
                    <div>
                      <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">
                        Total Amount
                      </p>
                      <p className="text-3xl font-black text-white mt-0.5">
                        KES {total.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      {recordType === "customer" ? (
                        <ShoppingCart className="w-7 h-7 text-white" />
                      ) : (
                        <Truck className="w-7 h-7 text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                      className="h-12 rounded-2xl w-12 flex-none border-border/50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      className={`flex-1 h-12 rounded-2xl text-base font-bold bg-gradient-to-r ${cfg.gradient} border-0 shadow-lg hover:shadow-xl transition-shadow`}
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
          <Card className="rounded-3xl border-0 shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h2 className="font-bold text-foreground">Recent Transactions</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {allRecords?.length ?? 0} total
              </span>
            </div>
            {isLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !allRecords?.length ? (
              <div className="py-12 text-center text-muted-foreground px-6 pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Droplets className="w-8 h-8 opacity-30" />
                </div>
                <p className="font-semibold">No records yet</p>
                <p className="text-sm mt-1">Tap "New Entry" to get started</p>
              </div>
            ) : (
              <div className="pb-2">
                {allRecords.slice(0, 20).map((record) => (
                  <RecordRow key={record.id || record.localId} record={record} />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* SMS Dialog */}
      <AlertDialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <AlertDialogContent className="rounded-3xl max-w-sm mx-4">
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
                <div className="mt-3 p-3 bg-muted rounded-2xl text-sm text-foreground italic border border-border/50">
                  {lastRecord && TYPE_CONFIG[lastRecord.type as RecordType].smsMsg(lastRecord)}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Skip</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendSms}
              className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 border-0"
            >
              Open SMS App
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
