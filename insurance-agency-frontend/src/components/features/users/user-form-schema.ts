// components/features/users/user-form-schema.ts
import * as z from 'zod';

const baseUserSchema = z.object({
  first_name: z.string()
    .min(2, { message: "First name must be at least 2 characters." })
    .max(50, { message: "First name must be less than 50 characters." }),
  
  last_name: z.string()
    .min(2, { message: "Last name must be at least 2 characters." })
    .max(50, { message: "Last name must be less than 50 characters." }),
  
  email: z.string()
    .email({ message: "Please enter a valid email address." })
    .max(100, { message: "Email must be less than 100 characters." }),
  
  branch: z.string().optional().nullable(),
});

export const createUserFormSchema = baseUserSchema.extend({
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters." })
    .max(100, { message: "Password must be less than 100 characters." }),
  
  groups: z.array(z.number())
    .min(1, { message: "Please select at least one role." }),
});

export const editUserFormSchema = baseUserSchema;

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
export type EditUserFormValues = z.infer<typeof editUserFormSchema>;
export type UserFormValues = CreateUserFormValues | EditUserFormValues;