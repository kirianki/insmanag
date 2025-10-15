// app/settings/users/page.tsx (unchanged from previous refactor, but uses new getUsers which supports params if needed)
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../../../lib/utils';

import { usersApi } from '../../../../lib/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Skeleton } from '../../../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../../../components/ui/alert';

export default function UsersHubPage() {
  const router = useRouter();

  const { data: usersData, isLoading: areUsersLoading, error: usersError } = useQuery({ 
    queryKey: ['users'], 
    queryFn: () => usersApi.getUsers(),  // No params for all users
  });
  
  const { data: agencyData, isLoading: isAgencyLoading, error: agencyError } = useQuery({ 
    queryKey: ['myAgency'], 
    queryFn: usersApi.getMyAgency,
  });

  const isLoading = areUsersLoading || isAgencyLoading;
  const hasError = !!(usersError || agencyError);
  const errorMessage = usersError?.message || agencyError?.message || 'Failed to load data';

  // Memoized user counts - Now uses branch_detail.id for accuracy
  const usersByBranch = React.useMemo(() => {
    const counts: { [key: string]: number } = { unassigned: 0 };
    usersData?.results.forEach(user => {
      const branchId = user.branch_detail?.id || 'unassigned';
      counts[branchId] = (counts[branchId] || 0) + 1;
    });
    return counts;
  }, [usersData]);

  const totalUsers = usersData?.results?.length || 0;
  const unassignedUserCount = usersByBranch['unassigned'] || 0;

  if (hasError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}. Please refresh.</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="mx-auto block">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4")}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Hub</h1>
          <p className="text-muted-foreground mt-1">
            Manage staff across {agencyData?.branches?.length || 0} branches
            {totalUsers > 0 && ` • ${totalUsers} total users`}
          </p>
        </div>
        <Button 
          onClick={() => router.push('/settings/users/branch/unassigned')}
          className="sm:self-center"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Users Card */}
          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">All Users</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total users in system</p>
            </CardContent>
          </Card>

          {/* Unassigned Users Card */}
          <Link href="/settings/users/branch/unassigned">
            <Card className={cn("hover:border-primary transition-colors cursor-pointer h-full", "border-muted")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Unassigned</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{unassignedUserCount}</p>
                <p className="text-xs text-muted-foreground">
                  {unassignedUserCount === 1 ? 'User not assigned' : 'Users not assigned to any branch'}
                </p>
              </CardContent>
            </Card>
          </Link>
          
          {/* Branch Cards */}
          {agencyData?.branches.map(branch => {
            const userCount = usersByBranch[branch.id] || 0;
            return (
              <Link href={`/settings/users/branch/${branch.id}`} key={branch.id}>
                <Card className={cn("hover:border-primary transition-colors cursor-pointer h-full", "border-muted")}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">{branch.branch_name}</CardTitle>
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{userCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {userCount === 1 ? 'user' : 'users'} in this branch
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}