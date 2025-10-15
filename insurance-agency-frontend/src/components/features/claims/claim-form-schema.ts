import * as z from 'zod';

// Based on the writable fields for creating a new Claim from the API spec
export const claimFormSchema = z.object({
  date_of_loss: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "A valid date is required.",
  }),
  loss_description: z.string().min(10, {
    message: "Please provide a detailed description (at least 10 characters).",
  }),
  estimated_amount: z.coerce.number().positive({
    message: "Please enter a valid estimated amount.",
  }).optional(),
  // We will add the policy and claimant IDs programmatically
});

export type ClaimFormValues = z.infer<typeof claimFormSchema>;