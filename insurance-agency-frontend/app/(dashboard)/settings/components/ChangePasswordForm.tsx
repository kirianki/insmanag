'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';
import { useToast } from '@/lib/hooks';
import { changePassword } from '@/services/accountsService';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const passwordSchema = z.object({
  old_password: z.string().min(1, "Current password is required."),
  new_password: z.string().min(8, "New password must be at least 8 characters."),
});
type PasswordFormData = z.infer<typeof passwordSchema>;

interface ErrorResponse {
  old_password?: string[];
}

export function ChangePasswordForm() {
  const { toast } = useToast();
  const form = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

  const mutation = useMutation<AxiosResponse, AxiosError<ErrorResponse>, PasswordFormData>({
    mutationFn: changePassword,
    onSuccess: () => {
        toast.success("Password Updated Successfully");
        form.reset({ old_password: '', new_password: '' });
    },
    onError: (err: AxiosError<ErrorResponse>) => {
        const errorMessage = err.response?.data?.old_password?.[0] || err.message;
        toast.error("Update Failed", { description: errorMessage });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your password here. After saving, you&apos;ll be logged out.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="old_password" render={({ field }) => (
                <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="new_password" render={({ field }) => (
                <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}