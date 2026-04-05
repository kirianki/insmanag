'use client';

import { ColumnDef } from '@tanstack/react-table';
import { PolicyList, PolicyStatus } from '@/types/api';
import { Calendar, User, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const EXPIRING_SOON_DAYS = 30;

// Determines the color of the status badge based on the policy status
const getStatusBadgeVariant = (status: PolicyStatus) => {
  switch (status) {
    case 'ACTIVE':
    case 'ACTIVE_INSTALLMENT':
    case 'ACTIVE_RECURRING':
      return 'default';
    case 'AWAITING_PAYMENT':
    case 'PARTIALLY_PAID':
    case 'PAID_PENDING_ACTIVATION':
      return 'secondary';
    case 'AT_RISK_MISSING_PAYMENT':
      return 'warning';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'destructive';
    case 'LAPSED':
      return 'outline';
    default:
      return 'secondary';
  }
};

const statusLabels: Record<PolicyStatus, string> = {
  AWAITING_PAYMENT: 'Awaiting Payment',
  PARTIALLY_PAID: 'Partially Paid',
  PAID_PENDING_ACTIVATION: 'Pending Activation',
  ACTIVE: 'Active',
  ACTIVE_INSTALLMENT: 'Active (Installment)',
  ACTIVE_RECURRING: 'Active (Recurring)',
  AT_RISK_MISSING_PAYMENT: 'At Risk',
  LAPSED: 'Lapsed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled'
};


export const columns: ColumnDef<PolicyList>[] = [
  {
    accessorKey: 'policy_number',
    header: 'Policy #',
    cell: ({ row }) => <div className="font-mono font-medium">{row.getValue('policy_number')}</div>,
  },
  {
    accessorKey: 'customer_name',
    header: 'Customer',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>{row.getValue('customer_name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'provider_name',
    header: 'Provider',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Building className="h-4 w-4 text-muted-foreground" />
        <span>{row.getValue('provider_name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'vehicle_registration_number',
    header: 'Vehicle Reg',
    cell: ({ row }) => {
      const reg = row.getValue('vehicle_registration_number') as string | undefined;
      return reg ? <div className="font-mono text-sm">{reg}</div> : <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as PolicyStatus;
      if (!status || !statusLabels[status]) {
        return <Badge variant="outline">Unknown</Badge>;
      }
      return <Badge variant={getStatusBadgeVariant(status)}>{statusLabels[status]}</Badge>;
    },
  },
  {
    accessorKey: 'premium_amount',
    header: () => <div className="text-right">Premium / Fee</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('premium_amount'));
      return (
        <div className="font-medium text-right">
          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: 'sum_insured',
    header: () => <div className="text-right">Sum Insured</div>,
    cell: ({ row }) => {
      const amount = row.getValue('sum_insured') ? parseFloat(row.getValue('sum_insured') as string) : null;
      if (amount === null) return <span className="text-muted-foreground text-xs text-right block">—</span>;
      return (
        <div className="font-medium text-right">
          {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: 'policy_end_date',
    header: 'Expires',
    cell: ({ row }) => {
      const date = new Date(row.getValue('policy_end_date'));
      const msDiff = date.getTime() - Date.now();
      const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      const isSoon = days >= 0 && days <= EXPIRING_SOON_DAYS;
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />

          {/* --- 2. CHANGE IS HERE --- */}
          {format(date, 'dd/MM/yy')}

          {isSoon && <Badge variant="warning" className="ml-1">Soon</Badge>}
        </div>
      );
    },
  },
];