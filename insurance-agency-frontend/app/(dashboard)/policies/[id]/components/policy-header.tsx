// app/(dashboard)/policies/[id]/components/policy-header.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Policy, PolicyStatus } from '@/types/api';
import { useAuth } from '@/lib/auth';
import { getUserRoles } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, CheckCircle, XCircle, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { DeletePolicyDialog } from '../../components/delete-policy-dialog';
import { ActivatePolicyDialog } from './activate-policy-dialog';
import { UpdateStatusDialog } from './update-status-dialog';
import { RecordPaymentDialog } from './record-payment-dialog'; // NEW: Import the payment dialog

interface PolicyHeaderProps {
  policy: Policy;
}

const getStatusBadgeVariant = (status?: PolicyStatus) => {
  if (!status) return 'secondary';
  switch (status) {
    case 'ACTIVE': case 'ACTIVE_INSTALLMENT': case 'ACTIVE_RECURRING': return 'default';
    case 'AWAITING_PAYMENT': case 'PAID_PENDING_ACTIVATION': return 'secondary';
    case 'AT_RISK_MISSING_PAYMENT': return 'warning';
    case 'EXPIRED': case 'CANCELLED': return 'destructive';
    case 'LAPSED': return 'outline';
    default: return 'secondary';
  }
};

export function PolicyHeader({ policy }: PolicyHeaderProps) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const userRoles = getUserRoles(user);

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isActivateDialogOpen, setActivateDialogOpen] = useState(false);
  const [isUpdateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false); // NEW: State for payment dialog

  const isAgencyAdmin = userRoles.includes('Agency Admin');
  const canManage = isAgencyAdmin || userRoles.includes('Branch Manager');

  // Determine if the policy is in a state where a payment can be recorded
  const isPayable = ['AWAITING_PAYMENT', 'PARTIALLY_PAID'].includes(policy.status);
  const isRecurringPayable = policy.policy_type_detail.payment_structure === 'RECURRING_FEE' && policy.status !== 'EXPIRED';

  return (
    <>
      <DeletePolicyDialog isOpen={isDeleteDialogOpen} setIsOpen={setDeleteDialogOpen} policyId={policy.id} policyNumber={policy.policy_number!} />
      <ActivatePolicyDialog isOpen={isActivateDialogOpen} setIsOpen={setActivateDialogOpen} policy={policy} />
      <UpdateStatusDialog isOpen={isUpdateStatusOpen} setIsOpen={setUpdateStatusOpen} policy={policy} />
      {/* NEW: Render the payment dialog */}
      <RecordPaymentDialog isOpen={isRecordPaymentOpen} setIsOpen={setRecordPaymentOpen} policy={policy} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link href="/policies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{policy.policy_number}</h1>
          <Badge variant={getStatusBadgeVariant(policy.status)} className="text-sm">
            {policy.status_display}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAuthLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <>
              {policy.status === 'PAID_PENDING_ACTIVATION' && canManage && (
                <Button onClick={() => setActivateDialogOpen(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate Policy
                </Button>
              )}
              {/* NEW: Show Record Payment button for admins if policy is payable */}
              {(isPayable || isRecurringPayable) && isAgencyAdmin && !policy.is_installment && (
                <Button onClick={() => setRecordPaymentOpen(true)} variant="secondary">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              )}
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/policies/${policy.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit Policy</span>
              </DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuItem onClick={() => setUpdateStatusOpen(true)}>
                    <XCircle className="mr-2 h-4 w-4" />
                    <span>Update Status</span>
                  </DropdownMenuItem>
                </>
              )}
              {canManage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Policy</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}