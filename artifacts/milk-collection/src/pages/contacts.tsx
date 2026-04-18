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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Plus, Pencil, Trash2, Phone, User } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

interface Contact {
  id: number;
  userId: number;
  type: string;
  name: string;
  phone?: string | null;
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
    },
  });

  const onSubmit = async (values: ContactForm) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { type, name: values.name, phone: values.phone || null },
        });
        toast({ title: "Contact updated" });
      } else {
        await createMutation.mutateAsync({
          data: { type, name: values.name, phone: values.phone || null },
        });
        toast({ title: "Contact added" });
      }
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Failed to save contact" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="mb-6 border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">
          {editing ? "Edit Contact" : `Add ${type === "farmer" ? "Farmer" : "Customer"}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Kamau" {...field} className="h-11" />
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
                      placeholder="e.g. 0712 345 678"
                      type="tel"
                      {...field}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editing ? "Save Changes" : "Add Contact"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
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

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingContact(undefined);
  };

  return (
    <div>
      {(showForm) && (
        <ContactFormCard
          type={type}
          onClose={handleCloseForm}
          editing={editingContact}
        />
      )}

      {!showForm && (
        <Button
          onClick={() => { setEditingContact(undefined); setShowForm(true); }}
          className="mb-4 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {type === "farmer" ? "Farmer" : "Customer"}
        </Button>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No {type === "farmer" ? "farmers" : "customers"} added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="border-card-border">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{contact.name}</p>
                  {contact.phone ? (
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-sm text-primary flex items-center gap-1 mt-0.5 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">No phone number</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(contact as Contact)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingId(contact.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this contact. Records linked to them will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage your farmers and customers.</p>
        </div>

        <Tabs defaultValue="farmers">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="farmers" className="flex-1 sm:flex-none">Farmers</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 sm:flex-none">Customers</TabsTrigger>
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
