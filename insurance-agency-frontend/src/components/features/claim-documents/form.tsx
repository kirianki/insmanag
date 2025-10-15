'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ClaimDocumentFormValues, claimDocumentFormSchema } from './form-schema';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';

interface ClaimDocumentFormProps {
  onSubmit: (values: FormData) => void;
  isPending: boolean;
}

export function ClaimDocumentForm({ onSubmit, isPending }: ClaimDocumentFormProps) {
  const form = useForm<ClaimDocumentFormValues>({
    resolver: zodResolver(claimDocumentFormSchema),
    defaultValues: {
      document_type: "",
    }
  });

  const handleFormSubmit = (values: ClaimDocumentFormValues) => {
    const formData = new FormData();
    formData.append('document_type', values.document_type);
    formData.append('file', values.file[0]);
    onSubmit(formData);
    form.reset();
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
                <Input placeholder="e.g., Police Report, Photo of Damage" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, onBlur, name, ref } }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  name={name}
                  ref={ref}
                  onBlur={onBlur}
                  onChange={(e) => {
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