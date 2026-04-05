'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, AgencyBranch, Role } from '@/types/api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const userSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  password: z.string().optional(),
  branch: z.string().min(1, "Branch is required"),
  groups: z.array(z.number()).min(1, "At least one role is required"),
});
export type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: User | null;
  branches: AgencyBranch[];
  roles: Role[];
  onSubmit: (data: UserFormData) => void;
  isPending: boolean;
}

export function UserForm({ initialData, branches, roles, onSubmit, isPending }: UserFormProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      email: initialData?.email || "",
      password: "",
      branch: initialData?.branch_detail?.id || "",
      groups: initialData?.roles?.map(r => {
        // Handle both string and object role formats
        if (typeof r === 'string') {
          // If it's a string, try to find the matching role ID from the roles prop
          const matchingRole = roles.find(role => role.name === r);
          return matchingRole ? matchingRole.id : 0;
        }
        return (r as { id: number }).id;
      }) || [],
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder={initialData ? "Leave blank to keep unchanged" : ""} {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="branch" render={({ field }) => (
          <FormItem>
            <FormLabel>Branch</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger></FormControl>
              <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <FormField control={form.control} name="groups" render={({ field }) => (
          <FormItem>
            <FormLabel>Role</FormLabel>
            <Select onValueChange={(value) => field.onChange([parseInt(value)])} defaultValue={field.value?.[0]?.toString()}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
              <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>
        <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save User"}</Button>
      </form>
    </Form>
  );
}