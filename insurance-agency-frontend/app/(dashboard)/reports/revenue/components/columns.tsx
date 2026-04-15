"use client";

import { ColumnDef } from "@tanstack/react-table";
import { AgencyRevenue } from "@/types/finance";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<AgencyRevenue>[] = [
    {
        accessorKey: "date_recognized",
        header: "Date",
        cell: ({ row }) => {
            const dateStr = row.getValue("date_recognized") as string;
            return dateStr ? format(parseISO(dateStr), "MMM dd, yyyy") : "N/A";
        },
    },
    {
        accessorKey: "customer_name",
        header: "Customer",
        cell: ({ row }) => row.getValue("customer_name") || "N/A",
    },
    {
        accessorKey: "source_policy_number",
        header: "Policy Number",
        cell: ({ row }) => (
            <span className="font-medium">{row.getValue("source_policy_number")}</span>
        ),
    },
    {
        accessorKey: "provider_name",
        header: "Provider",
    },
    {
        accessorKey: "vehicle_registration_number",
        header: "Vehicle Reg",
        cell: ({ row }) => row.getValue("vehicle_registration_number") || "-",
    },
    {
        accessorKey: "policy_type_name",
        header: "Policy Type",
    },
    {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"));
            return (
                <span className="font-bold text-emerald-600">
                    KES {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            );
        },
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
            <span className="text-muted-foreground text-xs truncate max-w-[200px] block">
                {row.getValue("description") || "-"}
            </span>
        ),
    },
];
