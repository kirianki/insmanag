import * as z from 'zod';

export const providerFormSchema = z.object({
  name: z.string().min(2, { message: "Provider name must be at least 2 characters." }),
  is_active: z.boolean().default(true),
});

export type ProviderFormValues = z.infer<typeof providerFormSchema>;