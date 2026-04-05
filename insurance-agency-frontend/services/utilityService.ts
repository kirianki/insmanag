// services/utilityService.ts

import { api } from '@/lib/api';
import {
  InsuranceProvider,
  PaginatedInsuranceProviderList,
  PaginatedNotificationList,
  PaginatedSystemLogList,
  SystemLog
} from '@/types/api';

// ===================================
// --- Analytics & Reports ---
// ===================================

export interface DashboardParams {
  agent_id?: string;
  branch_id?: string;
  date_from?: string;
  date_to?: string;
}

export const generateReport = (reportType: string, params: DashboardParams) =>
  api.get(`/reports/${reportType}/`, {
    params,
    responseType: 'blob',
  });

// ===================================
// --- Notifications ---
// ===================================

export const getNotifications = (params: { page?: number } = {}) =>
  api.get<PaginatedNotificationList>('/notifications/', { params });

export const markNotificationAsRead = (id: string) =>
  api.patch(`/notifications/${id}/`, { is_read: true });

export const markAllNotificationsAsRead = () =>
  api.post('/notifications/mark-all-as-read/', {});

// ===================================
// --- Audit Logs ---
// ===================================

export const getAuditLogs = (params: object) =>
  api.get<PaginatedSystemLogList>('/audit-logs/', { params });

export const getAuditLogById = (id: number) =>
  api.get<SystemLog>(`/audit-logs/${id}/`);

// ===================================
// --- Insurance Providers ---
// ===================================

// Returns paginated list with simplified provider objects (InsuranceProviderList)
export interface InsuranceProviderFilterParams {
  page?: number;
  search?: string;
  is_active?: boolean;
  page_size?: number;
}

export const getInsuranceProviders = (params: InsuranceProviderFilterParams = {}) =>
  api.get<PaginatedInsuranceProviderList>('/insurance-providers/', { params });

// Returns full provider details (InsuranceProvider)
export const getInsuranceProviderById = (id: string) =>
  api.get<InsuranceProvider>(`/insurance-providers/${id}/`);

export const createInsuranceProvider = (data: Partial<InsuranceProvider>) =>
  api.post<InsuranceProvider>('/insurance-providers/', data);

export const updateInsuranceProvider = (id: string, data: Partial<InsuranceProvider>) =>
  api.patch<InsuranceProvider>(`/insurance-providers/${id}/`, data);

export const deleteInsuranceProvider = (id: string) =>
  api.delete(`/insurance-providers/${id}/`);