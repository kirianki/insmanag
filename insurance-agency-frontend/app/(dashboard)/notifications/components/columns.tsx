// app/(dashboard)/notifications/components/columns.tsx

"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from "@tanstack/react-table";
import { Notification } from "@/types/api";
import { markNotificationAsRead, deleteNotification } from '@/services/notificationService';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Check, Eye } from "lucide-react";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const ActionsCell = ({ notification }: { notification: Notification }) => {
    const queryClient = useQueryClient();
    const router = useRouter();

    const mutationOptions = {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
    };
    
    const markReadMutation = useMutation({ mutationFn: () => markNotificationAsRead(notification.id, !notification.is_read), ...mutationOptions });
    const deleteMutation = useMutation({ mutationFn: () => deleteNotification(notification.id), ...mutationOptions });
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/policies/${notification.policy}`)}>
                    <Eye className="mr-2 h-4 w-4" /> View Policy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => markReadMutation.mutate()}>
                    <Check className="mr-2 h-4 w-4" /> Mark as {notification.is_read ? 'Unread' : 'Read'}
                </DropdownMenuItem>
                 <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate()}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


export const columns: ColumnDef<Notification>[] = [
    {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => {
            const isRead = row.original.is_read;
            return (
                <div className="flex items-center gap-3">
                    {!isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                    <span className={cn("font-medium", isRead && "text-muted-foreground")}>
                        {row.getValue("message")}
                    </span>
                </div>
            )
        }
    },
    {
        accessorKey: "created_at",
        header: "Received",
        cell: ({ row }) => format(new Date(row.getValue("created_at")), 'PP pp'), // e.g., Oct 26, 2025, 4:30 PM
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell notification={row.original} />,
    },
];