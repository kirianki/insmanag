'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { PaginatedNotifications, Notification } from '../../types';
import { Button } from '../../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// API Functions
const fetchNotifications = async (): Promise<PaginatedNotifications> => {
  const { data } = await api.get('/notifications/');
  return data;
};

const markAsRead = (id: string) => api.patch(`/notifications/${id}/`, { is_read: true });
const markAllAsRead = () => api.post('/notifications/mark-all-as-read/');

export function NotificationBell() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    // Refetch every minute to keep notifications fresh
    refetchInterval: 60000,
  });

  const mutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      // When one is marked as read, refetch the list to update the count and UI
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const allReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      mutation.mutate(notification.id);
    }
    // If it's linked to a policy, navigate to it
    if (notification.policy) {
      router.push(`/policies/${notification.policy}`);
    }
  };

  const unreadCount = notificationsData?.unread_count || 0;
  // Ensure notifications is always an array
  const notifications = Array.isArray(notificationsData?.results) 
    ? notificationsData.results 
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          Notifications
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => allReadMutation.mutate()}
              disabled={allReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">You have no new notifications.</p>
        )}
        {notifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className={`cursor-pointer flex flex-col items-start gap-1 ${!notification.is_read ? 'font-bold' : 'font-normal'}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <p className="text-sm whitespace-normal">{notification.message}</p>
            <p className={`text-xs ${!notification.is_read ? 'text-blue-500' : 'text-muted-foreground'}`}>
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}