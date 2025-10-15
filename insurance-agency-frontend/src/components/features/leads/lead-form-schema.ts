import * as z from 'zod';
import { LeadStatus } from '../../../types';

// Define the possible values for the 'source' field based on the API spec
const leadSources = z.enum(['WEBSITE', 'REFERRAL', 'WALK_IN', 'COLD_CALL', 'OTHER']);

export const leadFormSchema = z.object({
  first_name: z.string().min(2, { message: "First name is required." }),
  last_name: z.string().min(2, { message: "Last name is required." }),
  email: z.string().email({ message: "A valid email is required." }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "A valid phone number is required." }),
  source: leadSources.optional(),
  notes: z.string().optional(),
  // Status is managed by the Kanban board, not this form.
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;