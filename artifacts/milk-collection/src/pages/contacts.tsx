import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  getListContactsQueryKey,
} from "@workspace/api-client-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Pencil, Trash2, Phone, User, MapPin, Truck, ShoppingCart, X } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  region: z.string().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

interface Contact {
  id: number;
  userId: number;
  type: string;
  name: string;
  phone?: string | null;
  region?: string | null;
  createdAt: string;
}

function ContactFormCard({
  type,
  onClose,
  editing,
}: {
  type: "farmer" | "customer";
  onClose: () => void;
  editing?: Contact;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: editing?.name ?? "",
      phone: editing?.phone ?? "",
      region: editing?.region ?? "",
    },
  });

  const onSubmit = async (values: ContactForm) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { type, name: values.name, phone: values.phone || null, region: values.region || null },
        });
        toast({ title: "Contact updated" });
      } else {
        await createMutation.mutateAsync({
          data: { type, name: values.name, phone: values.phone || null, region: values.region || null },
        });
        toast({ title: "Contact added" });
      }
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Failed to save contact" });
    }
  };

  const gradient = type === "farmer" ? "from-emerald-600 to-teal-700" : "from-amber-500 to-orange-600";
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="mb-4 rounded-3xl border-0 shadow-xl overflow-hidden">
      <div className={`bg-gradient-to-r ${gradient} px-5 py-4 flex items-center justify-between`}>
        <p className="text-white font-bold text-sm">
          {editing ? "Edit Contact" : `Add ${type === "farmer" ? "Farmer" : "Customer"}`}
        </p>
        <button onClick={onClose} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
      <CardContent className="pt-5 pb-6 px-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="e.g. John Kamau" {...field} className="h-12 pl-10 rounded-2xl border-border/50 bg-muted/30 shadow-sm" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="0712 345 678" type="tel" {...field} className="h-12 pl-9 rounded-2xl border-border/50 bg-muted/30 shadow-sm" />
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
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Region</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="e.g. Thika Town" {...field} className="h-12 pl-9 rounded-2xl border-border/50 bg-muted/30 shadow-sm" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className={`w-full h-12 rounded-2xl font-bold bg-gradient-to-r ${gradient} border-0 shadow-lg`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Add Contact"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ContactList({ type }: { type: "farmer" | "customer" }) {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useListContacts({ type });
  const deleteMutation = useDeleteContact();

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync({ id: deletingId });
      toast({ title: "Contact deleted" });
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete contact" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const gradient = type === "farmer" ? "from-emerald-600 to-teal-700" : "from-amber-500 to-orange-600";
  const Icon = type === "farmer" ? Truck : ShoppingCart;

  return (
    <div className="space-y-3 pt-1">
      {showForm && (
        <ContactFormCard
          type={type}
          onClose={() => { setShowForm(false); setEditingContact(undefined); }}
          editing={editingContact}
        />
      )}

      {!showForm && (
        <Button
          onClick={() => { setEditingContact(undefined); setShowForm(true); }}
          className={`w-full h-12 rounded-2xl font-bold bg-gradient-to-r ${gradient} border-0 shadow-lg gap-2`}
        >
          <Plus className="w-4 h-4" />
          Add {type === "farmer" ? "Farmer" : "Customer"}
        </Button>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg opacity-30`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <p className="font-medium">No {type === "farmer" ? "farmers" : "customers"} yet</p>
            <p className="text-sm mt-1">Tap the button above to add one</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="rounded-2xl border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-4">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{contact.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {(contact as any).region && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {(contact as any).region}
                        </span>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </a>
                      )}
                      {!(contact as any).region && !contact.phone && (
                        <span className="text-xs text-muted-foreground">No details added</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(contact as Contact)}
                      className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeletingId(contact.id)}
                      className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-red-50 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this contact. Records linked to them will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-2xl bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Contacts() {
  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your farmers and customers.</p>
        </div>

        <Tabs defaultValue="farmers">
          <TabsList className="w-full rounded-2xl bg-muted/50 p-1 h-auto">
            <TabsTrigger value="farmers" className="flex-1 rounded-xl data-[state=active]:shadow-sm py-2.5 gap-1.5">
              <Truck className="w-4 h-4" /> Farmers
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 rounded-xl data-[state=active]:shadow-sm py-2.5 gap-1.5">
              <ShoppingCart className="w-4 h-4" /> Customers
            </TabsTrigger>
          </TabsList>
          <TabsContent value="farmers" className="mt-4">
            <ContactList type="farmer" />
          </TabsContent>
          <TabsContent value="customers" className="mt-4">
            <ContactList type="customer" />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
