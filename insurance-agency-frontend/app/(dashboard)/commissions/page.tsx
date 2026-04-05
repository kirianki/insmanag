'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyCommissionsTab } from './components/MyCommissionsTab';
import { PayoutBatchesTab } from './components/PayoutBatchesTab';
import { CustomerPaymentsTab } from './components/CustomerPaymentsTab';
import { CommissionApprovalTab } from './components/CommissionApprovalTab';
import { useAuth } from '@/lib/auth';
import { getUserRoles } from '@/lib/utils';

export default function CommissionsPage() {
  const { user } = useAuth();

  // FIX: The `getUserRoles` utility expects a more generic user type (`UserWithRoles`)
  // than the strict `User` type provided by `useAuth`. We cast the user object 
  // to 'any' to resolve this specific type mismatch, as we know the underlying 
  // 'roles' structure is compatible for the function's purpose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles = getUserRoles(user as any);

  const isManager = roles.includes('Branch Manager');
  const isAdmin = roles.includes('Agency Admin');
  const isManagerOrAdmin = isManager || isAdmin;

  if (!user) return null;

  const defaultTab = isManagerOrAdmin ? "team-commissions" : "personal-commissions";

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Commissions & Payouts" />

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-2 overflow-x-auto">
          {isManagerOrAdmin && (
            <TabsTrigger value="team-commissions">Team Commissions</TabsTrigger>
          )}
          <TabsTrigger value="personal-commissions">Personal Commissions</TabsTrigger>
          {isManagerOrAdmin && (
            <TabsTrigger value="approval-queue">Approval Queue</TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="payout-batches">Payout Batches</TabsTrigger>
          )}
          {isManagerOrAdmin && (
            <TabsTrigger value="customer-payments">Payment Log</TabsTrigger>
          )}
        </TabsList>

        {isManagerOrAdmin && (
          <TabsContent value="team-commissions" className="mt-4">
            <MyCommissionsTab
              title="Team Commission Records"
              description="A historical list of all commission records generated across your scope."
            />
          </TabsContent>
        )}

        <TabsContent value="personal-commissions" className="mt-4">
          <MyCommissionsTab
            agentId={user.id}
            title="My Personal Commissions"
            description="Commissions earned directly from your own policy sales."
          />
        </TabsContent>

        {isManagerOrAdmin && (
          <TabsContent value="approval-queue" className="mt-4">
            <CommissionApprovalTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="payout-batches" className="mt-4">
            <PayoutBatchesTab />
          </TabsContent>
        )}

        {isManagerOrAdmin && (
          <TabsContent value="customer-payments" className="mt-4">
            <CustomerPaymentsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}