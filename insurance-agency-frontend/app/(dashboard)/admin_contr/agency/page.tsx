'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BranchesTab } from './components/BranchesTab';
import { ProvidersTab } from './components/ProvidersTab';
import { PolicyTypesTab } from './components/PolicyTypesTab';
import { AgencyProfileTab } from './components/AgencyProfileTab';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AgencySettingsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const agency = user?.agency_detail;
  const agencyId = agency?.id;

  const isLoading = isAuthLoading;

  if (!isLoading && !agencyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Agency Settings" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not find agency details for your user account. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Agency Settings" />

      {/* Tabs for Managing Settings */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : (
        // Because of the check at the top, agencyId is guaranteed to be a string here.
        agencyId && (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Agency Profile</TabsTrigger>
              <TabsTrigger value="branches">Branches</TabsTrigger>
              <TabsTrigger value="providers">Insurance Providers</TabsTrigger>
              <TabsTrigger value="policy-types">Policy Types</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agency Profile</CardTitle>
                  <CardDescription>Manage your agency&apos;s core information and settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  <AgencyProfileTab agencyId={agencyId} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="branches" className="mt-4">
              <BranchesTab agencyId={agencyId} />
            </TabsContent>
            <TabsContent value="providers" className="mt-4">
              <ProvidersTab />
            </TabsContent>
            <TabsContent value="policy-types" className="mt-4">
              <PolicyTypesTab agencyId={agencyId} />
            </TabsContent>
          </Tabs>
        )
      )}
    </div>
  );
}