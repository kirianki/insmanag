// app/(dashboard)/notifications/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllNotificationsAsRead } from '@/services/notificationService';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/lib/hooks';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { columns } from './components/columns';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);

  const queryParams = {
    page: pageIndex + 1,
    page_size: pageSize,
    ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
  };

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', queryParams],
    queryFn: () => getNotifications(queryParams).then(res => res.data),
    placeholderData: (previousData) => previousData,
  });
  
  const pageCount = notificationsData?.count ? Math.ceil(notificationsData.count / pageSize) : 0;
  
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read.");
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error("Failed to mark all as read.")
  });

  const hasUnreadNotifications = notificationsData?.results?.some(notif => !notif.is_read);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader 
        title="Notifications"
        actionButtonText={hasUnreadNotifications ? "Mark All as Read" : undefined}
        onActionButtonClick={() => markAllReadMutation.mutate()}
      />
      <Card>
        <CardContent className="p-4">
            <DataTable
              columns={columns}
              data={notificationsData?.results || []}
              isLoading={isLoading}
              pageCount={pageCount}
              pagination={{ pageIndex, pageSize }}
              setPagination={setPagination}
              sorting={sorting}
              setSorting={setSorting}
              emptyStateMessage="You have no notifications."
            />
        </CardContent>
      </Card>
    </div>
  );
}