'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLead } from '@/services/crmService';
import { useToast } from '@/lib/hooks';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const leadFormSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  last_name: z.string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  phone: z.string()
    .min(1, 'Phone number is required')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format'),
  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  source: z.enum(['WEBSITE','REFERRAL','WALK_IN','COLD_CALL','OTHER']).optional(),
  source_detail: z.string().max(120).optional().or(z.literal('')),
  preferred_contact_method: z.enum(['PHONE','EMAIL','WHATSAPP']).optional(),
  next_follow_up_at: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  consent_marketing: z.boolean().optional(),
  tags: z.array(z.string().min(1)).max(10).optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface CreateLeadFormProps {
  onSuccess: () => void;
}

interface ErrorResponse {
  message?: string;
  detail?: string;
}

interface SanitizedLeadData {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  source?: 'WEBSITE' | 'REFERRAL' | 'WALK_IN' | 'COLD_CALL' | 'OTHER';
  source_detail?: string;
  preferred_contact_method?: 'PHONE' | 'EMAIL' | 'WHATSAPP';
  next_follow_up_at?: string;
  notes?: string;
  consent_marketing?: boolean;
  tags?: string[];
}

export function CreateLeadForm({ onSuccess }: CreateLeadFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const form = useForm<LeadFormData>({ 
    resolver: zodResolver(leadFormSchema), 
    defaultValues: { 
      first_name: '', 
      last_name: '', 
      phone: '', 
      email: '',
      source: undefined,
      source_detail: '',
      preferred_contact_method: undefined,
      next_follow_up_at: '',
      notes: '',
      consent_marketing: false,
      tags: [],
    },
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      setErrorMessage(null);
      
      const sanitizedData: SanitizedLeadData = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || undefined,
        source: data.source,
        source_detail: data.source_detail?.trim() || undefined,
        preferred_contact_method: data.preferred_contact_method,
        next_follow_up_at: data.next_follow_up_at || undefined,
        notes: data.notes?.trim() || undefined,
        consent_marketing: data.consent_marketing,
        tags: data.tags,
      };
      
      return createLead(sanitizedData);
    },
    onSuccess: (response) => {
      const data = response.data;
      toast.success('Lead Created Successfully', { 
        description: `${data.first_name} ${data.last_name} has been added to your pipeline.` 
      });
      
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      form.reset();
      
      setTimeout(() => {
        onSuccess();
      }, 500);
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      console.error('Lead creation error:', error);
      
      const message = error?.response?.data?.message 
        || error?.response?.data?.detail
        || error?.message 
        || 'An unexpected error occurred. Please try again.';
      
      setErrorMessage(message);
      toast.error('Failed to Create Lead', { description: message });
    },
  });

  const onSubmit = (data: LeadFormData) => {
    if (!data.first_name.trim() || !data.last_name.trim()) {
      setErrorMessage('First name and last name cannot be empty');
      return;
    }
    
    mutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {mutation.isSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Lead created successfully!
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField 
              control={form.control} 
              name="first_name" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="John"
                      disabled={mutation.isPending}
                      autoComplete="given-name"
                    />
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
                    <Input 
                      {...field} 
                      placeholder="Doe"
                      disabled={mutation.isPending}
                      autoComplete="family-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="WEBSITE">Website</SelectItem>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
                      <SelectItem value="WALK_IN">Walk-in</SelectItem>
                      <SelectItem value="COLD_CALL">Cold call</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_contact_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Contact</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PHONE">Phone</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField 
            control={form.control} 
            name="source_detail" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Detail</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="Referral name, campaign, etc."
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField 
            control={form.control} 
            name="next_follow_up_at" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Follow-up (ISO)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="2025-10-14T15:00:00Z"
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField 
            control={form.control} 
            name="notes" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Context, needs, objections..."
                    rows={4}
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3">
            <FormField 
              control={form.control} 
              name="consent_marketing" 
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Consent to marketing</FormLabel>
                </FormItem>
              )}
            />
          </div>
          
          <FormField 
            control={form.control} 
            name="email" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="email"
                    placeholder="john.doe@example.com"
                    disabled={mutation.isPending}
                    autoComplete="email"
                  />
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
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    disabled={mutation.isPending}
                    autoComplete="tel"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={mutation.isPending || !form.formState.isValid}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Lead'
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                form.reset();
                setErrorMessage(null);
              }}
              disabled={mutation.isPending}
            >
              Clear
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}