'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationAsRead } from '@/services/notificationService';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/lib/hooks';

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => getNotifications({ page_size: 5 }).then(res => res.data),
    refetchInterval: 60000,
  });

  const notifications = Array.isArray(notificationsData?.results)
    ? notificationsData.results
    : [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast.error("Failed to mark as read."),
  });

  const handleNotificationClick = (id: string, policyId: string, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate(id);
    }
    router.push(`/policies/${policyId}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-700
                     text-gray-900 dark:text-gray-200"
        >
          <Bell className="h-5 w-5" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center 
                             justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[90vw] sm:w-80 p-0 rounded-xl shadow-lg"
        sideOffset={8}
      >
        <div className="p-4 flex justify-between items-center">
          <h3 className="text-base sm:text-lg font-medium">Notifications</h3>
          <Button variant="link" className="p-0 h-auto text-xs" asChild>
            <Link href="/notifications">View All</Link>
          </Button>
        </div>

        <Separator />

        <div className="p-2 max-h-[60vh] sm:max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() =>
                  handleNotificationClick(notif.id, notif.policy, notif.is_read ?? false)
                }
                className={cn(
                  "flex items-start p-3 sm:p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                  !notif.is_read && "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                {!notif.is_read && (
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0" />
                )}

                <div className={cn("flex-1 space-y-1 min-w-0")}>
                  <p className="text-xs sm:text-sm font-medium leading-tight break-words">
                    {notif.message}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center p-4">
              You&apos;re all caught up!
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}