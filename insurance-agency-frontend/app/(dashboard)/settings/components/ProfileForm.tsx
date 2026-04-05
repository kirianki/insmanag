'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';

import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/hooks';
import { updateMe } from '@/services/accountsService';
import { User } from '@/types/api';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';

// Schema matches the flat structure expected by the backend
const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  phone_number: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  profile_picture: z.instanceof(File).optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(
    user?.profile?.profile_picture || null
  );

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.profile?.phone_number || '',
      bio: user?.profile?.bio || '',
      profile_picture: undefined,
    }
  });

  // Update image preview when user profile changes
  useEffect(() => {
    setImagePreview(user?.profile?.profile_picture || null);
  }, [user?.profile?.profile_picture]);

  // Mutation for updating profile
  const mutation = useMutation<AxiosResponse<User>, AxiosError<unknown>, FormData>({
    mutationFn: updateMe,
    onSuccess: () => {
      toast.success("Profile Updated Successfully");
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
    onError: (err: AxiosError<unknown>) => {
      console.error("Profile update failed:", err.response?.data);
      const errorData = err.response?.data;

      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            toast.error(`${field}: ${messages.join(', ')}`);
          }
        });
      } else {
        toast.error("Update Failed", {
          description: "An unexpected error occurred while updating the profile."
        });
      }
    }
  });

  const onSubmit = (data: ProfileFormData) => {
    const formData = new FormData();
    formData.append('first_name', data.first_name);
    formData.append('last_name', data.last_name);
    formData.append('phone_number', data.phone_number || '');
    formData.append('bio', data.bio || '');

    if (data.profile_picture instanceof File) {
      formData.append('profile_picture', data.profile_picture);
    }

    mutation.mutate(formData);
  };

  // --- QUICK FIX IMPLEMENTED HERE ---
  // A helper variable to construct the correct display URL for the avatar.
  // It checks if the URL is a relative path starting with '/media/' and prepends '/api' if it is.
  const getDisplayUrl = (url: string | null): string | undefined => {
    if (!url) return undefined;

    // This handles both full URLs (http://...) and relative paths (/media/...).
    try {
      const urlObject = new URL(url, window.location.origin);
      if (urlObject.pathname.startsWith('/media/')) {
        return `/api${urlObject.pathname}`;
      }
    } catch {
      // Fallback for invalid URLs
      return url;
    }

    return url;
  };

  const displayUrl = getDisplayUrl(imagePreview);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          This is how others will see you on the site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Profile Picture Upload */}
            <FormField
              control={form.control}
              name="profile_picture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      {/* Use the new `displayUrl` variable here to show the corrected path */}
                      <AvatarImage
                        src={displayUrl}
                        alt="Profile Picture"
                      />
                      <AvatarFallback>
                        <UserIcon className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("File too large", {
                                description: "Please select an image smaller than 5MB"
                              });
                              return;
                            }
                            field.onChange(file);
                            // The preview for a newly selected file is a temporary blob URL, which is fine.
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone Number */}
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+254 712 345 678"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bio */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us a little bit about yourself"
                      {...field}
                      value={field.value ?? ''}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email (Read-only) */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      disabled
                      {...field}
                      className="cursor-not-allowed bg-muted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}