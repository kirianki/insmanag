import * as z from 'zod';

export const providerCommissionFormSchema = z.object({
  policy_type: z.string({ required_error: "Please select a policy type." }),
  commission_type: z.enum(['NEW_BUSINESS', 'RENEWAL'], {
    required_error: "Please select a commission type.",
  }),
  rate_percentage: z.coerce.number()
    .min(0, { message: "Rate must be positive." })
    .max(100, { message: "Rate cannot exceed 100." }),
});

export type ProviderCommissionFormValues = z.infer<typeof providerCommissionFormSchema>;