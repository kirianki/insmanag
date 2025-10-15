import * as z from 'zod';

export const policyActivationFormSchema = z.object({
  insurance_certificate_number: z.string().min(1, {
    message: "The insurance certificate number is required.",
  }),
});

export type PolicyActivationFormValues = z.infer<typeof policyActivationFormSchema>;