import * as z from 'zod';

export const policyTypeFormSchema = z.object({
  name: z.string().min(3, { message: "Policy type name must be at least 3 characters." }),
  requires_vehicle_reg: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type PolicyTypeFormValues = z.infer<typeof policyTypeFormSchema>;