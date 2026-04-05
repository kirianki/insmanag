"use client"

import { Badge } from "@/components/ui/badge"
import { ColumnDef, Row } from "@tanstack/react-table"
import { Customer } from "@/types/api"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getKycBadgeVariant = (statusValue: string): BadgeVariant => {
  switch (statusValue) {
    case 'VERIFIED':
      return 'default';
    case 'PENDING':
      return 'secondary';
    case 'REJECTED':
      return 'destructive';
    default:
      return 'outline';
  }
};

// CustomerActionsCell removed

export const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "customer_number",
    header: "Customer #",
    cell: ({ row }: { row: Row<Customer> }) => (
      <div className="font-mono">{row.getValue("customer_number")}</div>
    )
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }: { row: Row<Customer> }) => {
      const customer = row.original;
      const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      return (
        <div className="font-medium">{fullName}</div>
      );
    }
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }: { row: Row<Customer> }) => {
      const email = row.getValue("email") as string;
      return email ? <a href={`mailto:${email}`} className="hover:underline">{email}</a> : <span className="text-muted-foreground">N/A</span>;
    }
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "kyc_status",
    header: "KYC Status",
    cell: ({ row }: { row: Row<Customer> }) => {
      const kyc = row.original.kyc_status;
      const value = typeof kyc === 'object' && kyc !== null ? kyc.value : kyc as string;
      const label = typeof kyc === 'object' && kyc !== null ? kyc.label : kyc as string;

      if (!value) return null;

      return <Badge variant={getKycBadgeVariant(value)}>{label}</Badge>
    }
  },
  {
    accessorKey: "assigned_agent",
    header: "Assigned Agent",
    cell: ({ row }: { row: Row<Customer> }) => {
      const agent = row.original.assigned_agent;
      return agent ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim() : <span className="text-muted-foreground">N/A</span>;
    }
  },
  // Actions column removed
];