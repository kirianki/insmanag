import * as z from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

export const claimDocumentFormSchema = z.object({
  document_type: z.string().min(3, { message: "Document type is required (e.g., Police Report)." }),
  file: z
    .any()
    .refine((files) => files?.length == 1, "A file is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png, .webp and .pdf files are accepted."
    ),
});

export type ClaimDocumentFormValues = z.infer<typeof claimDocumentFormSchema>;