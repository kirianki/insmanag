import * as z from 'zod';

export const commissionRuleFormSchema = z.object({
  // These will be UUIDs (strings)
  provider: z.string().optional(),
  policy_type: z.string().optional(),
  payout_basis: z.enum(['AGENCY_COMMISSION', 'TOTAL_PREMIUM'], {
    required_error: "You must select a payout basis.",
  }),
  // Coerce the input to a number for validation
  rate_percentage: z.coerce.number()
    .min(0, { message: "Rate must be positive." })
    .max(100, { message: "Rate cannot exceed 100." }),
});

export type CommissionRuleFormValues = z.infer<typeof commissionRuleFormSchema>;