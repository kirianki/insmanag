import * as z from 'zod';

// NEW: Schema for a single installment
const installmentPlanSchema = z.object({
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "A valid due date is required.",
  }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
});

export const policyFormSchema = z.object({
  customer: z.string({ required_error: "Please select a customer." }),
  total_premium_amount: z.coerce.number().positive({ message: "Premium must be a positive number." }), // FIX: Renamed
  policy_start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "A valid start date is required.",
  }),
  policy_end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "A valid end date is required.",
  }),
  provider: z.string({ required_error: "Please select an insurance provider." }),
  policy_type: z.string({ required_error: "Please select a policy type." }),
  vehicle_registration_number: z.string().optional(),
  // NEW: Fields for installment plan
  is_installment: z.boolean().default(false),
  installment_plan: z.array(installmentPlanSchema).optional(),
}).refine(data => {
  if (data.is_installment) {
    // If it is an installment plan, the plan array must exist and not be empty
    return data.installment_plan && data.installment_plan.length > 0;
  }
  return true;
}, {
  message: "An installment plan is required when 'Is Installment' is checked.",
  path: ["installment_plan"],
}).refine(data => {
  if (data.is_installment && data.installment_plan) {
    // If it's an installment plan, the sum of installment amounts must equal the total premium
    const totalInstallmentAmount = data.installment_plan.reduce((sum, item) => sum + item.amount, 0);
    // Use a small epsilon for floating point comparison
    return Math.abs(totalInstallmentAmount - data.total_premium_amount) < 0.01;
  }
  return true;
}, {
  message: "The sum of installment amounts must equal the total premium amount.",
  path: ["installment_plan"],
});

export type PolicyFormValues = z.infer<typeof policyFormSchema>;