'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { InsuranceProvider } from '@/types/api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

// A more comprehensive Zod schema that covers most editable fields
const providerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  short_name: z.string().optional(),
  registration_number: z.string().optional(),
  // FIX: Remove .default() to ensure strict type matching with the form.
  is_active: z.boolean(),
  
  // Contact Info
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone_number: z.string().optional(),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  
  // Address
  physical_address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),

  // Contact Person
  contact_person_name: z.string().optional(),
  contact_person_email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  contact_person_phone: z.string().optional(),

  // Claims Contact
  claims_email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  claims_phone: z.string().optional(),

  notes: z.string().optional(),
});
export type ProviderFormData = z.infer<typeof providerSchema>;

interface ProviderFormProps {
  initialData?: InsuranceProvider | null;
  onSubmit: (data: ProviderFormData) => void;
  isPending: boolean;
  submitButtonText?: string;
}

export function ProviderForm({ initialData, onSubmit, isPending, submitButtonText = "Save Provider" }: ProviderFormProps) {
  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    // This defaultValues setup is correct and sufficient.
    defaultValues: {
      name: initialData?.name || "",
      short_name: initialData?.short_name || "",
      registration_number: initialData?.registration_number || "",
      is_active: initialData?.is_active ?? true,
      email: initialData?.email || "",
      phone_number: initialData?.phone_number || "",
      website: initialData?.website || "",
      physical_address: initialData?.physical_address || "",
      city: initialData?.city || "",
      country: initialData?.country || "kenya",
      contact_person_name: initialData?.contact_person_name || "",
      contact_person_email: initialData?.contact_person_email || "",
      contact_person_phone: initialData?.contact_person_phone || "",
      claims_email: initialData?.claims_email || "",
      claims_phone: initialData?.claims_phone || "",
      notes: initialData?.notes || "",
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
        {/* Basic Info */}
        <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Provider Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="short_name" render={({ field }) => (
                <FormItem><FormLabel>Short Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="registration_number" render={({ field }) => (
                <FormItem><FormLabel>Registration #</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>

        {/* General Contact */}
        <h4 className="text-sm font-medium border-b pb-1 mt-6">General Contact</h4>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="phone_number" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        <FormField control={form.control} name="website" render={({ field }) => (
            <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )}/>

        {/* Contact Person */}
        <h4 className="text-sm font-medium border-b pb-1 mt-6">Contact Person</h4>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="contact_person_name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="contact_person_email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>

        {/* Claims Contact */}
        <h4 className="text-sm font-medium border-b pb-1 mt-6">Claims Department</h4>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="claims_email" render={({ field }) => (
                <FormItem><FormLabel>Claims Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="claims_phone" render={({ field }) => (
                <FormItem><FormLabel>Claims Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>

        {/* Notes & Status */}
        <h4 className="text-sm font-medium border-b pb-1 mt-6">Other Details</h4>
        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Internal Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="is_active" render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel>Provider is Active</FormLabel>
            </FormItem>
        )}/>

        <div className="pt-4">
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : submitButtonText}</Button>
        </div>
      </form>
    </Form>
  )
}