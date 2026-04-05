// services/notificationService.ts

import { api } from '@/lib/api';
import { PaginatedNotificationList } from '@/types/api';

export interface NotificationFilterParams {
  page?: number;
  page_size?: number;
  ordering?: string;
}

/**
 * Fetches a paginated list of notifications, including the unread count.
 */
export const getNotifications = (params: NotificationFilterParams = {}) =>
  api.get<PaginatedNotificationList>('/notifications/', { params });

/**
 * Marks a specific notification as read or unread.
 */
export const markNotificationAsRead = (id: string, is_read: boolean = true) =>
  api.patch(`/notifications/${id}/`, { is_read });

/**
 * Marks all notifications as read for the current user.
 */
export const markAllNotificationsAsRead = () =>
  api.post('/notifications/mark-all-as-read/');

/**
 * Deletes a specific notification.
 */
export const deleteNotification = (id: string) =>
  api.delete(`/notifications/${id}/`);