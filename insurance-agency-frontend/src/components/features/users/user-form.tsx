// components/features/users/user-form.tsx (unchanged from previous, but form now receives branch ID from defaultValues, which maps to SelectItem value)
'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { Checkbox } from '../../ui/checkbox';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

import { usersApi } from '../../../lib/users';
import { UserFormValues, createUserFormSchema, editUserFormSchema, CreateUserFormValues, EditUserFormValues } from './user-form-schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../ui/form';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface UserFormProps {
  onSubmit: (values: UserFormValues) => void;
  isPending: boolean;
  defaultValues?: Partial<UserFormValues>;
  mode: 'create' | 'edit';
}

type FormValues = UserFormValues;

export function UserForm({ onSubmit, isPending, defaultValues, mode }: UserFormProps) {
  const [selectedRoles, setSelectedRoles] = useState<number[]>(defaultValues?.groups as number[] || []);

  const { data: rolesData, isLoading: areRolesLoading, error: rolesError } = useQuery({ 
    queryKey: ['roles'], 
    queryFn: usersApi.getRoles,
    retry: 1,
  });
  
  const { data: agencyData, isLoading: isAgencyLoading, error: agencyError } = useQuery({ 
    queryKey: ['myAgency'], 
    queryFn: usersApi.getMyAgency,
    retry: 1,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(mode === 'edit' ? (editUserFormSchema as any) : createUserFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      ...(mode === 'create' ? { password: '', groups: [] } : {}),
      branch: undefined,
      ...defaultValues,
    } as FormValues,
    mode: 'onChange',
  });

  const isLoading = areRolesLoading || isAgencyLoading;
  const isCreate = mode === 'create';

  const handleRoleSelect = (roleId: number) => {
    const newSelected = selectedRoles.includes(roleId)
      ? selectedRoles.filter(id => id !== roleId)
      : [...selectedRoles, roleId];
    setSelectedRoles(newSelected);
    form.setValue('groups' as keyof FormValues, newSelected as any);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="John" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Doe" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address *</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  {...field} 
                  disabled={mode === 'edit' || isPending}
                  placeholder="john.doe@example.com" 
                />
              </FormControl>
              {mode === 'edit' && (
                <p className="text-xs text-muted-foreground pt-1" id="email-help">
                  Email cannot be changed after creation.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="branch"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ""}
                disabled={isAgencyLoading || isPending}
              >
                <FormControl>
                  <SelectTrigger aria-describedby={agencyError ? 'branch-error' : undefined}>
                    <SelectValue placeholder={
                      isAgencyLoading ? "Loading branches..." : 
                      agencyError ? "Failed to load branches" : 
                      "Select a branch (optional)"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {agencyData?.branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agencyError && <p id="branch-error" className="text-xs text-destructive pt-1">{String(agencyError.message)}</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        {isCreate && (
          <>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      {...field} 
                      disabled={isPending}
                      placeholder="At least 8 characters"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Roles * (Multi-select)</FormLabel>
              <FormControl>
                <Popover open={selectedRoles.length > 0} onOpenChange={() => {}}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={selectedRoles.length > 0}
                      className="w-full justify-between"
                      disabled={areRolesLoading || isPending}
                    >
                      {areRolesLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : selectedRoles.length === 0 ? (
                        "Select roles..."
                      ) : (
                        `${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''} selected`
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search roles..." />
                      <CommandEmpty>No roles found.</CommandEmpty>
                      <CommandGroup className="max-h-[300px]">
                        <ScrollArea className="h-[300px]">
                          {rolesData?.results.map((role) => (
                            <CommandItem
                              key={role.id}
                              value={role.name}
                              onSelect={() => handleRoleSelect(role.id)}
                              className="cursor-pointer"
                            >
                              <div className="mr-2 flex items-center">
                                <Checkbox
                                  id={`role-${role.id}`}
                                  checked={selectedRoles.includes(role.id)}
                                  onCheckedChange={() => handleRoleSelect(role.id)}
                                />
                                <label
                                  htmlFor={`role-${role.id}`}
                                  className="cursor-pointer"
                                >
                                  {role.name}
                                </label>
                              </div>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormControl>
              <div className="flex flex-wrap gap-1 pt-2">
                {selectedRoles.map((roleId) => {
                  const role = rolesData?.results.find(r => r.id === roleId);
                  if (!role) return null;
                  return (
                    <Badge key={roleId} variant="secondary">
                      {role.name}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => handleRoleSelect(roleId)}
                      />
                    </Badge>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          </>
        )}

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={isPending || isLoading || !form.formState.isValid}
            className="min-w-24"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}