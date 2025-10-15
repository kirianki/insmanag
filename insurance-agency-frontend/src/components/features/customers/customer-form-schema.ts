import * as z from 'zod';

// Based on the writable fields in the Customer schema from the API spec
export const customerFormSchema = z.object({
  first_name: z.string().min(2, { message: "First name must be at least 2 characters." }),
  last_name: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Phone number seems too short." }),
  id_number: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;