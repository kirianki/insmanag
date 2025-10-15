// app/settings/users/[userId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { formatDate } from '../../../../../../lib/utils';

import api from '../../../../../../lib/api';
import { User, EditUserFormValues } from '../../../../../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../../components/ui/card';
import { Button } from '../../../../../../components/ui/button';
import { UserForm } from '../../../../../../components/features/users/user-form';
import { Alert, AlertDescription } from '../../../../../../components/ui/alert';
import { Badge } from '../../../../../../components/ui/badge';

const fetchUserById = async (id: string): Promise<User> => {
  const { data } = await api.get(`/accounts/users/${id}/`);
  return data;
};

const updateUser = async ({ userId, userData }: { userId: string; userData: Partial<EditUserFormValues> }): Promise<User> => {
  const { data } = await api.patch(`/accounts/users/${userId}/`, userData);
  return data;
};

export default function UserDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const userId = params.userId as string;

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert("User updated successfully!");
    },
    onError: (err) => {
      console.error("Failed to update user", err);
      alert("Error: Could not update user.");
    }
  });

  const handleUpdateUser = (values: Partial<EditUserFormValues>) => {
    const { password, groups, ...safeValues } = values;
    mutation.mutate({ userId, userData: safeValues });
  };

  if (isLoading) return <div className="p-8 text-center">Loading user data...</div>;
  if (error) return (
    <div className="space-y-6">
      <Link href="/settings/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to User Hub
      </Link>
      <Alert variant="destructive">
        <AlertDescription>Error loading user: {error.message}</AlertDescription>
      </Alert>
    </div>
  );
  if (!user) return (
    <div className="space-y-6">
      <Link href="/settings/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to User Hub
      </Link>
      <Alert>
        <AlertDescription>User not found.</AlertDescription>
      </Alert>
    </div>
  );

  const defaultFormValues: EditUserFormValues = {
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    branch: user.branch || undefined,  // ID for form select
  };

  return (
    <div className="space-y-6">
      <Link href="/settings/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to User Hub
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Edit User</h1>
          <p className="text-muted-foreground">{user.first_name} {user.last_name}</p>
          {user.created_at && (
            <p className="text-xs text-muted-foreground">Joined {formatDate(user.created_at)}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/settings/commission-rules/${user.id}`}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Commission
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Badge variant="secondary">{user.roles.join(', ') || 'No Role'}</Badge>
        {user.branch_detail ? (
          <Badge variant="outline">{user.branch_detail.branch_name}</Badge>
        ) : (
          <Badge variant="secondary">Unassigned</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Update the user's information. Passwords can only be changed by the user themselves from their own profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            onSubmit={handleUpdateUser}
            isPending={mutation.isPending}
            defaultValues={defaultFormValues}
            mode="edit"
          />
        </CardContent>
      </Card>
    </div>
  );
}