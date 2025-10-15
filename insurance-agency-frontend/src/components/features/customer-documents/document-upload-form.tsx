'use client';
import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf"
];

// ✅ Schema now expects FileList
const uploadSchema = z.object({
  document_type: z.string().min(3, { message: "Document type is required." }),
  file: z
    .custom<FileList>((val) => val instanceof FileList, {
      message: "File is required",
    })
    .refine((files) => files?.length === 1, "File is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png, .webp and .pdf files are accepted."
    ),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface DocumentUploadFormProps {
  onSubmit: (values: FormData) => void;
  isPending: boolean;
}

export function DocumentUploadForm({ onSubmit, isPending }: DocumentUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      document_type: "",
    },
  });

  const handleFormSubmit = (values: UploadFormValues) => {
    console.log("Form values at submit:", values);

    if (values.file) {
      console.log("File chosen at submit:", values.file[0]);
    } else {
      console.warn("No file present in form values at submit!");
    }

    const formData = new FormData();
    formData.append('document_type', values.document_type);
    formData.append('file', values.file[0]); // ✅ safe now
    onSubmit(formData);

    // Reset form and file input
    form.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="document_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g., National ID, Passport" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, onBlur, name } }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  name={name}
                  ref={fileInputRef}
                  onBlur={onBlur}
                  onChange={(e) => {
                    console.log("File input change event:", e.target.files);
                    onChange(e.target.files);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
