'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAuth } from '../../../hooks/use-auth';
import { StaffCommission, User } from '../../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { DataTable } from '../../../components/shared/data-table';
import { commissionColumns } from '../../../components/features/commissions/columns';
import { UpdateProfileForm } from '../../../components/features/profile/update-profile-form';
import { ChangePasswordForm } from '../../../components/features/profile/change-password-form';

// API Functions
const updateProfile = (values: Partial<User>) => api.patch('/accounts/users/me/', values);
const changePassword = (values: { old_password: string, new_password: string }) => api.post('/accounts/auth/change-password/', values);
const fetchMyCommissions = async (): Promise<{ results: StaffCommission[] }> => api.get('/commissions/staff-commissions/').then(res => res.data);

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: commissionsData, isLoading: areCommissionsLoading } = useQuery({
    queryKey: ['myCommissions'],
    queryFn: fetchMyCommissions,
  });

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      alert('Profile updated successfully!');
      // Invalidate user data to refetch it across the app
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error) => alert(`Error updating profile: ${error.message}`),
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => alert('Password changed successfully!'),
    onError: (error) => alert(`Error changing password: ${error.message}`),
  });

  // Filter out columns not relevant to the personal view
  const myCommissionColumns = commissionColumns.filter(
    col => col.accessorKey !== 'agent_name' && col.id !== 'actions'
  );

  if (!user) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile Details</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
          <TabsTrigger value="commissions">My Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your name and email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <UpdateProfileForm
                onSubmit={profileMutation.mutate}
                isPending={profileMutation.isPending}
                defaultValues={user}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Enter your current and new password.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm
                onSubmit={passwordMutation.mutate}
                isPending={passwordMutation.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>My Commission History</CardTitle>
              <CardDescription>A complete history of all your earned commissions.</CardDescription>
            </CardHeader>
            <CardContent>
              {areCommissionsLoading ? <p>Loading commissions...</p> : (
                <DataTable
                  columns={myCommissionColumns}
                  data={commissionsData?.results || []}
                  filterColumnId="policy_number"
                  filterPlaceholder="Filter by policy #..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}