// app/(dashboard)/policies/components/create-policy-form.tsx

'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
import {
  createPolicyEnhanced,
  getCreatePolicyDropdownData,
  CreatePolicyRequest,
} from '@/services/policyService';
import { Policy, PolicyType, PaymentFrequency } from '@/types/api';
import { useToast } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2, UserIcon, Building, FileText, CreditCard, Search, Lock, DollarSign, Shield, Repeat, HeartPulse } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// --- CORRECTED SCHEMA ---
const formSchema = z.object({
  customer: z.string().min(1, "Please select a customer"),
  agent: z.string().min(1, "Agent is required"),
  provider: z.string().min(1, "Please select an insurance provider"),
  policy_type: z.string().min(1, "Please select a policy type"),
  premium_amount: z.number().min(0.01, "Premium/Fee amount is required"),
  
  // Date fields - z.date() is required by default, no need for required_error
  policy_start_date: z.date(),
  policy_end_date: z.date(),

  vehicle_registration_number: z.string().optional(),
  
  sum_insured: z.number().optional(),
  deductible: z.number().optional(),
  payment_frequency: z.string().optional(),
  next_due_date: z.date().optional(),
  
  additional_details: z.object({
    inpatient_limit: z.number().optional(),
    outpatient_limit: z.number().optional(),
    dental_limit: z.number().optional(),
    optical_limit: z.number().optional(),
    coverage_type: z.string().optional(),
    dependents: z.array(
      z.object({
        full_name: z.string().min(1, "Name is required."),
        dob: z.date(), // Date is required by default
        relationship: z.enum(['Spouse', 'Child']),
      })
    ).optional(),
  }).optional(),

  is_installment: z.boolean(),
  installment_plan: z.array(z.object({ 
    due_date: z.date(), // Date is required by default
    amount: z.number().min(0.01, "Amount is required") 
  })).optional(),
})
.refine((data) => data.policy_end_date > data.policy_start_date, { 
  message: "End date must be after start date", 
  path: ["policy_end_date"] 
})
.refine((data) => {
    if (data.is_installment && data.installment_plan) {
      const total = data.installment_plan.reduce((sum, item) => sum + item.amount, 0);
      return Math.abs(total - data.premium_amount) < 0.01;
    }
    return true;
  }, { 
    message: "Sum of installment amounts must equal total premium", 
    path: ["installment_plan"] 
  });

type FormValues = z.infer<typeof formSchema>;
interface UserWithAgency { id: string; first_name: string; last_name: string; agency_detail?: { id: string }; agency?: string; agency_id?: string; }
interface ApiError { response?: { data?: { detail?: string; [key: string]: unknown; }; }; message?: string; }
interface CreatePolicyFormProps { onSuccess: (newPolicy: Policy) => void; onCancel: () => void; initialCustomerId?: string; }

const FormSkeleton = () => ( <div className="space-y-6 p-1"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> <Skeleton className="h-10 w-32 ml-auto" /> </div> );

const coverageTypeOptions = [
  { value: 'M', label: 'Member Only (M)', dependents: 0 },
  { value: 'M+1', label: 'Member + 1 (M+1)', dependents: 1 },
  { value: 'M+2', label: 'Member + 2 (M+2)', dependents: 2 },
  { value: 'M+3', label: 'Member + 3 (M+3)', dependents: 3 },
  { value: 'M+4', label: 'Member + 4 (M+4)', dependents: 4 },
  { value: 'M+5', label: 'Member + 5 (M+5)', dependents: 5 },
];

export function CreatePolicyForm({ onSuccess, onCancel, initialCustomerId }: CreatePolicyFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPolicyType, setSelectedPolicyType] = useState<PolicyType | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [providerSearch, setProviderSearch] = useState('');
  const [policyTypeSearch, setPolicyTypeSearch] = useState('');

  const agencyId = (user as UserWithAgency)?.agency_detail?.id || (user as UserWithAgency)?.agency || (user as UserWithAgency)?.agency_id;

  const { data: dropdownData, isLoading: dropdownLoading, error: dropdownError, refetch } = useQuery({
    queryKey: ['create-policy-dropdown', agencyId],
    queryFn: () => { if (!agencyId) throw new Error("No agency ID available"); return getCreatePolicyDropdownData(agencyId); },
    enabled: !!agencyId && !!user,
  });

  // Filtering logic for search functionality
  const filteredCustomers = useMemo(() => {
    if (!dropdownData?.customers) return [];
    return dropdownData.customers.filter(customer => {
      const searchTerm = customerSearch.toLowerCase();
      const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
      return fullName.includes(searchTerm) || 
             customer.phone?.toLowerCase().includes(searchTerm) ||
             customer.email?.toLowerCase().includes(searchTerm);
    });
  }, [dropdownData?.customers, customerSearch]);

  const filteredProviders = useMemo(() => {
    if (!dropdownData?.providers) return [];
    return dropdownData.providers.filter(provider => 
      provider.name.toLowerCase().includes(providerSearch.toLowerCase())
    );
  }, [dropdownData?.providers, providerSearch]);

  const filteredPolicyTypes = useMemo(() => {
    if (!dropdownData?.policyTypes) return [];
    return dropdownData.policyTypes.filter(policyType => 
      policyType.name.toLowerCase().includes(policyTypeSearch.toLowerCase())
    );
  }, [dropdownData?.policyTypes, policyTypeSearch]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      is_installment: false, 
      installment_plan: [], 
      policy_start_date: new Date(), 
      policy_end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 
      agent: user?.id || '', 
      vehicle_registration_number: '', 
      customer: initialCustomerId || '', 
      provider: '', 
      policy_type: '', 
      premium_amount: undefined, 
      additional_details: { dependents: [] } 
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "additional_details.dependents",
  });

  const watchedPolicyType = form.watch('policy_type');
  const watchedIsInstallment = form.watch('is_installment');
  const watchedInstallmentPlan = form.watch('installment_plan');
  const watchedTotalPremium = form.watch('premium_amount');
  const watchedCoverageType = form.watch('additional_details.coverage_type');

  useEffect(() => {
    if (watchedPolicyType && dropdownData?.policyTypes) {
      const policyType = dropdownData.policyTypes.find(pt => pt.id === watchedPolicyType);
      setSelectedPolicyType(policyType || null);
    } else { 
      setSelectedPolicyType(null); 
    }
  }, [watchedPolicyType, dropdownData?.policyTypes]);
  
  useEffect(() => { 
    if (user?.id) form.setValue('agent', user.id) 
  }, [user?.id, form]);
  
  useEffect(() => { 
    if (initialCustomerId) form.setValue('customer', initialCustomerId) 
  }, [initialCustomerId, form]);

  const isRecurringPolicy = useMemo(() => selectedPolicyType?.payment_structure === 'RECURRING_FEE', [selectedPolicyType]);
  const isMedicalPolicy = useMemo(() => selectedPolicyType?.name?.toLowerCase().includes('medical'), [selectedPolicyType]);

  useEffect(() => {
    if (!isMedicalPolicy) return;
    const selectedOption = coverageTypeOptions.find(opt => opt.value === watchedCoverageType);
    const requiredDependents = selectedOption?.dependents || 0;
    const currentDependents = fields.length;
    
    if (currentDependents < requiredDependents) {
      const toAdd = requiredDependents - currentDependents;
      for (let i = 0; i < toAdd; i++) {
        append({ full_name: '', dob: new Date(), relationship: 'Child' });
      }
    } else if (currentDependents > requiredDependents) {
      const toRemove = currentDependents - requiredDependents;
      const newFields = fields.slice(0, currentDependents - toRemove);
      replace(newFields);
    }
  }, [watchedCoverageType, fields, append, remove, replace, isMedicalPolicy]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreatePolicyRequest = {
        customer: values.customer, 
        agent: values.agent, 
        provider: values.provider, 
        policy_type: values.policy_type,
        premium_amount: values.premium_amount!.toString(),
        policy_start_date: format(values.policy_start_date, 'yyyy-MM-dd'),
        policy_end_date: format(values.policy_end_date, 'yyyy-MM-dd'),
        vehicle_registration_number: values.vehicle_registration_number || undefined,
        sum_insured: values.sum_insured?.toString(),
        deductible: values.deductible?.toString(),
        payment_frequency: values.payment_frequency as PaymentFrequency | undefined,
        next_due_date: values.next_due_date ? format(values.next_due_date, 'yyyy-MM-dd') : undefined,
        additional_details: isMedicalPolicy ? {
          inpatient_limit: values.additional_details?.inpatient_limit,
          outpatient_limit: values.additional_details?.outpatient_limit,
          dental_limit: values.additional_details?.dental_limit,
          optical_limit: values.additional_details?.optical_limit,
          coverage_type: values.additional_details?.coverage_type,
          dependents: values.additional_details?.dependents?.map(dep => ({ 
            ...dep, 
            dob: format(dep.dob, 'yyyy-MM-dd') 
          })),
        } : undefined,
        is_installment: isRecurringPolicy ? false : values.is_installment,
        installment_plan: !isRecurringPolicy && values.is_installment && values.installment_plan ? 
          values.installment_plan.map(inst => ({ 
            due_date: format(inst.due_date, 'yyyy-MM-dd'), 
            amount: Number(inst.amount).toString(), 
          })) : undefined,
      };
      return createPolicyEnhanced(payload);
    },
    onSuccess: (response) => { 
      toast.success("Policy Created"); 
      queryClient.invalidateQueries({ queryKey: ['policies'] }); 
      onSuccess(response.data); 
    },
    onError: (err: ApiError) => { 
      const errorDetail = err.response?.data; 
      const errorMessage = errorDetail?.detail || 
        (typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : err.message || "An unexpected error occurred."); 
      toast.error("Creation Failed", { description: errorMessage }); 
    }
  });

  const addInstallment = () => { 
    const currentInstallments = form.getValues('installment_plan') || []; 
    const lastDueDate = currentInstallments.length > 0 ? 
      new Date(currentInstallments[currentInstallments.length - 1].due_date) : new Date(); 
    const nextDueDate = new Date(lastDueDate); 
    nextDueDate.setMonth(nextDueDate.getMonth() + 1); 
    form.setValue('installment_plan', [...currentInstallments, { due_date: nextDueDate, amount: 0 }]); 
  };

  const removeInstallment = (index: number) => { 
    const currentInstallments = form.getValues('installment_plan') || []; 
    form.setValue('installment_plan', currentInstallments.filter((_, i) => i !== index)); 
  };

  const remainingAmount = watchedInstallmentPlan && watchedTotalPremium != null ? 
    watchedInstallmentPlan.reduce((sum, item) => sum - (Number(item.amount) || 0), Number(watchedTotalPremium)) : 0;
  
  const onSubmit = (values: FormValues) => mutation.mutate(values);

  if (authLoading || dropdownLoading) return <FormSkeleton />;
  if (!user || !agencyId) return <div className="text-center py-8 text-destructive">Could not determine user or agency.</div>;
  if (dropdownError) return <div className="text-center py-8"><p className="text-destructive">Failed to load form data.</p><Button variant="outline" onClick={() => refetch()} className="mt-4">Retry</Button></div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Policy Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              control={form.control} 
              name="customer" 
              render={({ field }) => ( 
                <FormItem> 
                  <FormLabel className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" /> Customer
                  </FormLabel> 
                  <div className="space-y-2"> 
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search customers by name, phone..." 
                        value={customerSearch} 
                        onChange={(e) => setCustomerSearch(e.target.value)} 
                        className="pl-8" 
                        disabled={!!initialCustomerId}
                      />
                    </div> 
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!initialCustomerId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[400px]" position="popper" sideOffset={5}>
                        {filteredCustomers.map((customer) => ( 
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.first_name} {customer.last_name} - {customer.phone}
                          </SelectItem> 
                        ))}
                        {filteredCustomers.length === 0 && ( 
                          <div className="p-2 text-sm text-center text-muted-foreground">
                            No customers found
                          </div> 
                        )}
                      </SelectContent> 
                    </Select> 
                  </div> 
                  <FormMessage /> 
                </FormItem> 
              )}
            />
            
            <FormField 
              control={form.control} 
              name="agent" 
              render={() => ( 
                <FormItem> 
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Agent
                  </FormLabel> 
                  <FormControl> 
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50 h-10">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.first_name} {user.last_name} (You)</span>
                    </div> 
                  </FormControl> 
                  <FormDescription>Policies are automatically assigned to you.</FormDescription> 
                  <FormMessage /> 
                </FormItem> 
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                control={form.control} 
                name="provider" 
                render={({ field }) => ( 
                  <FormItem> 
                    <FormLabel className="flex items-center gap-2">
                      <Building className="h-4 w-4" /> Insurance Provider
                    </FormLabel> 
                    <div className="space-y-2"> 
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search providers..." 
                          value={providerSearch} 
                          onChange={(e) => setProviderSearch(e.target.value)} 
                          className="pl-8"
                        />
                      </div> 
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[400px]" position="popper" sideOffset={5}>
                          {filteredProviders.map((p) => ( 
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem> 
                          ))}
                          {filteredProviders.length === 0 && ( 
                            <div className="p-2 text-sm text-center text-muted-foreground">
                              No providers found
                            </div> 
                          )}
                        </SelectContent> 
                      </Select> 
                    </div> 
                    <FormMessage /> 
                  </FormItem> 
                )}
              />
              
              <FormField 
                control={form.control} 
                name="policy_type" 
                render={({ field }) => ( 
                  <FormItem> 
                    <FormLabel>Policy Type</FormLabel> 
                    <div className="space-y-2"> 
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search policy types..." 
                          value={policyTypeSearch} 
                          onChange={(e) => setPolicyTypeSearch(e.target.value)} 
                          className="pl-8"
                        />
                      </div> 
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select policy type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[400px]" position="popper" sideOffset={5}>
                          {filteredPolicyTypes.map((t) => ( 
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem> 
                          ))}
                          {filteredPolicyTypes.length === 0 && ( 
                            <div className="p-2 text-sm text-center text-muted-foreground">
                              No policy types found
                            </div> 
                          )}
                        </SelectContent> 
                      </Select> 
                    </div> 
                    <FormMessage /> 
                  </FormItem> 
                )}
              />
            </div>
            
            {selectedPolicyType?.requires_vehicle_reg && ( 
              <FormField 
                control={form.control} 
                name="vehicle_registration_number" 
                render={({ field }) => ( 
                  <FormItem> 
                    <FormLabel>Vehicle Registration</FormLabel> 
                    <FormControl>
                      <Input placeholder="e.g., KAA123A" {...field} value={field.value ?? ''} />
                    </FormControl> 
                    <FormDescription>Required for {selectedPolicyType.name}</FormDescription> 
                    <FormMessage /> 
                  </FormItem> 
                )}
              /> 
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                control={form.control} 
                name="policy_start_date" 
                render={({ field }) => ( 
                  <FormItem className="flex flex-col">
                    <FormLabel>Policy Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button 
                            variant="outline" 
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={field.value} 
                          onSelect={field.onChange} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem> 
                )}
              />
              
              <FormField 
                control={form.control} 
                name="policy_end_date" 
                render={({ field }) => ( 
                  <FormItem className="flex flex-col">
                    <FormLabel>Policy End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button 
                            variant="outline" 
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={field.value} 
                          onSelect={field.onChange} 
                          disabled={(date) => date < form.getValues('policy_start_date')} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem> 
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isRecurringPolicy && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField 
                  control={form.control} 
                  name="sum_insured" 
                  render={({ field }) => ( 
                    <FormItem> 
                      <FormLabel>Sum Insured / Limit (KES)</FormLabel> 
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="1,000,000" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} 
                          value={field.value ?? ''} 
                        />
                      </FormControl> 
                      <FormMessage /> 
                    </FormItem> 
                  )}
                />
                <FormField 
                  control={form.control} 
                  name="deductible" 
                  render={({ field }) => ( 
                    <FormItem> 
                      <FormLabel>Deductible / Excess (KES)</FormLabel> 
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="10,000" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} 
                          value={field.value ?? ''} 
                        />
                      </FormControl> 
                      <FormMessage /> 
                    </FormItem> 
                  )}
                />
              </div>
            )}
            <FormField 
              control={form.control} 
              name="premium_amount" 
              render={({ field }) => ( 
                <FormItem> 
                  <FormLabel>
                    {isRecurringPolicy ? `Recurring Fee Amount (KES)` : `Total Premium Amount (KES)`}
                  </FormLabel> 
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder={isRecurringPolicy ? "5,000" : "50,000"} 
                      {...field} 
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                      value={field.value ?? ''} 
                    />
                  </FormControl> 
                  <FormMessage /> 
                </FormItem> 
              )}
            />
          </CardContent>
        </Card>

        {isRecurringPolicy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" /> Recurring Payment Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                control={form.control} 
                name="payment_frequency" 
                render={({ field }) => ( 
                  <FormItem> 
                    <FormLabel>Payment Frequency</FormLabel> 
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent> 
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="SEMI_ANNUALLY">Semi-Annually</SelectItem>
                        <SelectItem value="ANNUALLY">Annually</SelectItem> 
                      </SelectContent> 
                    </Select> 
                    <FormMessage /> 
                  </FormItem> 
                )}
              />
              <FormField 
                control={form.control} 
                name="next_due_date" 
                render={({ field }) => ( 
                  <FormItem className="flex flex-col">
                    <FormLabel>First Payment Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button 
                            variant="outline" 
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={field.value} 
                          onSelect={field.onChange} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem> 
                )}
              />
            </CardContent>
          </Card>
        )}

        {isMedicalPolicy && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Medical Coverage Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField 
                  control={form.control} 
                  name="additional_details.inpatient_limit" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>In-Patient Limit (KES)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="500,000" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} 
                          value={field.value ?? ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="additional_details.outpatient_limit" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Out-Patient Limit (KES)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="50,000" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} 
                          value={field.value ?? ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="additional_details.dental_limit" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dental Limit (KES)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15,000" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} 
                          value={field.value ?? ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="additional_details.optical_limit" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Optical Limit (KES)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15,000" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} 
                          value={field.value ?? ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5" /> Dependents & Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField 
                  control={form.control} 
                  name="additional_details.coverage_type" 
                  render={({ field }) => ( 
                    <FormItem> 
                      <FormLabel>Coverage Type</FormLabel> 
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select who is covered" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent> 
                          {coverageTypeOptions.map(opt => ( 
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem> 
                          ))} 
                        </SelectContent> 
                      </Select> 
                      <FormMessage /> 
                    </FormItem> 
                  )}
                />
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4 border p-4 rounded-md relative">
                    <FormLabel className="text-base">Dependent {index + 1}</FormLabel>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2" 
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField 
                        control={form.control} 
                        name={`additional_details.dependents.${index}.full_name`} 
                        render={({ field }) => ( 
                          <FormItem className="sm:col-span-2"> 
                            <FormLabel>Full Name</FormLabel> 
                            <FormControl>
                              <Input placeholder="e.g., Jane Doe" {...field} />
                            </FormControl> 
                            <FormMessage /> 
                          </FormItem> 
                        )}
                      />
                      <FormField 
                        control={form.control} 
                        name={`additional_details.dependents.${index}.relationship`} 
                        render={({ field }) => ( 
                          <FormItem> 
                            <FormLabel>Relationship</FormLabel> 
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Spouse">Spouse</SelectItem>
                                <SelectItem value="Child">Child</SelectItem>
                              </SelectContent> 
                            </Select> 
                            <FormMessage /> 
                          </FormItem> 
                        )}
                      />
                    </div>
                    <FormField 
                      control={form.control} 
                      name={`additional_details.dependents.${index}.dob`} 
                      render={({ field }) => ( 
                        <FormItem className="flex flex-col"> 
                          <FormLabel>Date of Birth</FormLabel> 
                          <Popover> 
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button 
                                  variant="outline" 
                                  className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger> 
                            <PopoverContent className="w-auto p-0">
                              <Calendar 
                                mode="single" 
                                selected={field.value} 
                                onSelect={field.onChange} 
                                fromYear={1920} 
                                toYear={new Date().getFullYear()} 
                                initialFocus 
                              />
                            </PopoverContent> 
                          </Popover> 
                          <FormMessage /> 
                        </FormItem> 
                      )}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        {!isRecurringPolicy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Payment Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField 
                control={form.control} 
                name="is_installment" 
                render={({ field }) => ( 
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"> 
                    <div>
                      <FormLabel className="text-base">Use Installment Plan</FormLabel>
                      <FormDescription>Split the premium into multiple payments.</FormDescription>
                    </div> 
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl> 
                  </FormItem> 
                )}
              />
              {watchedIsInstallment && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Installment Schedule</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
                      Add Installment
                    </Button>
                  </div>
                  {watchedInstallmentPlan?.map((_, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <FormField 
                        control={form.control} 
                        name={`installment_plan.${index}.due_date`} 
                        render={({ field }) => ( 
                          <FormItem className="flex-1"> 
                            <FormLabel>Due Date</FormLabel> 
                            <Popover> 
                              <PopoverTrigger asChild> 
                                <FormControl> 
                                  <Button 
                                    variant="outline" 
                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                  > 
                                    {field.value ? format(field.value, "PPP") : <span>Pick date</span>} 
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> 
                                  </Button> 
                                </FormControl> 
                              </PopoverTrigger> 
                              <PopoverContent className="w-auto p-0"> 
                                <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={field.onChange} 
                                  initialFocus 
                                /> 
                              </PopoverContent> 
                            </Popover> 
                            <FormMessage /> 
                          </FormItem> 
                        )}
                      />
                      <FormField 
                        control={form.control} 
                        name={`installment_plan.${index}.amount`} 
                        render={({ field }) => ( 
                          <FormItem className="flex-1"> 
                            <FormLabel>Amount (KES)</FormLabel> 
                            <FormControl> 
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                {...field} 
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                                value={field.value ?? ''} 
                              /> 
                            </FormControl> 
                            <FormMessage /> 
                          </FormItem> 
                        )}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeInstallment(index)} 
                        className="mb-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {typeof remainingAmount === 'number' && remainingAmount !== 0 && (
                    <div className={cn("text-sm p-2 rounded", remainingAmount > 0 ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800")}>
                      {remainingAmount > 0 ? `Remaining amount to allocate: KES ${remainingAmount.toFixed(2)}` : `Over-allocated by: KES ${Math.abs(remainingAmount).toFixed(2)}`}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Policy"}
          </Button>
        </div>
      </form>
    </Form>
  );
}