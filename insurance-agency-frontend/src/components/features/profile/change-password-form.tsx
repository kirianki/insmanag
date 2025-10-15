'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';

const formSchema = z.object({
  old_password: z.string().min(1, { message: "Current password is required." }),
  new_password: z.string().min(8, { message: "New password must be at least 8 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

interface ChangePasswordFormProps {
  onSubmit: (values: FormValues) => void;
  isPending: boolean;
}

export function ChangePasswordForm({ onSubmit, isPending }: ChangePasswordFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { old_password: '', new_password: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="old_password" render={({ field }) => (
          <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="new_password" render={({ field }) => (
          <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Change Password'}</Button>
        </div>
      </form>
    </Form>
  );
}