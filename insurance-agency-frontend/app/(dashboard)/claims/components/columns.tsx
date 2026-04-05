"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Claim } from "@/types/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Eye } from "lucide-react"
import Link from "next/link"

// Define a type that handles both potential shapes of the status field from DRF
type StatusField = string | { value: string; label: string };

const getStatusLabel = (status: StatusField): string => {
  if (typeof status === 'object' && status !== null) {
    return status.label;
  }
  return status;
};

const getStatusValue = (status: StatusField): string => {
  if (typeof status === 'object' && status !== null) {
    return status.value;
  }
  return status;
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getBadgeVariant = (statusRaw: StatusField): BadgeVariant => {
  const s = getStatusValue(statusRaw);
  if (['APPROVED', 'SETTLED'].includes(s)) return 'default';
  if (['FNOL', 'UNDER_REVIEW', 'AWAITING_DOCS'].includes(s)) return 'secondary';
  if (['REJECTED', 'CLOSED'].includes(s)) return 'destructive';
  return 'outline';
};

export const columns: ColumnDef<Claim>[] = [
  { 
    accessorKey: "claim_number", 
    header: "Claim #",
    cell: ({ row }) => (
      <Link href={`/claims/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
        {row.original.claim_number || "Draft"}
      </Link>
    )
  },
  { 
    accessorKey: "policy_number", 
    header: "Policy #",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.policy_number}</span>
  },
  { 
    accessorKey: "claimant_name", 
    header: "Claimant",
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      // We cast this safely because we handle the type logic in helper functions
      const status = row.original.status as unknown as StatusField;
      return (
        <Badge variant={getBadgeVariant(status)}>
          {row.original.status_display || getStatusLabel(status)}
        </Badge>
      )
    }
  },
  { 
    accessorKey: "date_of_loss", 
    header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Date of Loss <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
    },
    cell: ({ row }) => new Date(row.original.date_of_loss).toLocaleDateString()
  },
  { 
    accessorKey: "estimated_loss_amount", 
    header: "Est. Loss",
    cell: ({ row }) => {
        const amount = row.original.estimated_loss_amount;
        return amount ? `KES ${Number(amount).toLocaleString()}` : '-';
    }
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="icon">
        <Link href={`/claims/${row.original.id}`}>
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">View</span>
        </Link>
      </Button>
    ),
  },
]