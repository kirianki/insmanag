import { api } from '@/lib/api';
import {
  CustomerPayment,
  PaginatedCustomerPaymentList,
  PaginatedPayoutBatchList,
  PaginatedProviderCommissionStructureList,
  PaginatedStaffCommissionList,
  PaginatedStaffCommissionRuleList,
  PayoutBatch,
  ProviderCommissionStructure,
  SimulatePaymentRequest,
  SimulatePaymentResponse,
  StaffCommission,
  StaffCommissionRule,
  StaffCommissionStatus
} from '@/types/api';

// ===================================
// --- Filter Parameter Interfaces ---
// ===================================

export interface StaffCommissionFilterParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  status?: StaffCommissionStatus;
  agent?: string;
}

export interface PayoutBatchFilterParams {
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface CustomerPaymentFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

// ===================================
// --- Staff Commission Rules ---
// ===================================

export const getStaffCommissionRules = (params: { page?: number; user?: string } = {}) =>
  api.get<PaginatedStaffCommissionRuleList>('/commissions/staff-commission-rules/', { params });

export const createStaffCommissionRule = (data: Partial<StaffCommissionRule>) =>
  api.post<StaffCommissionRule>('/commissions/staff-commission-rules/', data);

export const updateStaffCommissionRule = (id: string, data: Partial<StaffCommissionRule>) =>
  api.patch<StaffCommissionRule>(`/commissions/staff-commission-rules/${id}/`, data);

export const deleteStaffCommissionRule = (id: string) =>
  api.delete(`/commissions/staff-commission-rules/${id}/`);

// ===================================
// --- Provider Commission Structures ---
// ===================================

export const getProviderCommissionStructures = (params: { page?: number; provider?: string } = {}) =>
  api.get<PaginatedProviderCommissionStructureList>(
    '/commissions/provider-commission-structures/',
    { params }
  );

// accept only the creation fields (no `id`)
export const createProviderCommissionStructure = (
  data: Omit<ProviderCommissionStructure, 'id'>
) =>
  api.post<ProviderCommissionStructure>(
    '/commissions/provider-commission-structures/',
    data
  );

export const updateProviderCommissionStructure = (
  id: string,
  data: Partial<ProviderCommissionStructure>
) =>
  api.patch<ProviderCommissionStructure>(
    `/commissions/provider-commission-structures/${id}/`,
    data
  );

export const deleteProviderCommissionStructure = (id: string) =>
  api.delete(`/commissions/provider-commission-structures/${id}/`);

// ===================================
// --- Staff Commissions (Instances) ---
// ===================================

export const getStaffCommissions = (params: StaffCommissionFilterParams = {}) =>
  api.get<PaginatedStaffCommissionList>('/commissions/staff-commissions/', { params });

export const approveStaffCommission = (id: string) =>
  api.post<StaffCommission>(`/commissions/staff-commissions/${id}/approve/`, {});

// ===================================
// --- Payout Batches ---
// ===================================

export const getPayoutBatches = (params: PayoutBatchFilterParams = {}) =>
  api.get<PaginatedPayoutBatchList>('/commissions/payout-batches/', { params });

export const createPayoutBatch = () =>
  api.post<PayoutBatch>('/commissions/payout-batches/', {});

// ===================================
// --- Customer Payments & Simulation ---
// ===================================

export const getCustomerPayments = (params: CustomerPaymentFilterParams = {}) =>
  api.get<PaginatedCustomerPaymentList>('/commissions/customer-payments/', { params });

export const getCustomerPaymentById = (id: string) =>
  api.get<CustomerPayment>(`/commissions/customer-payments/${id}/`);

export const simulatePayment = (data: SimulatePaymentRequest) =>
  api.post<SimulatePaymentResponse>('/commissions/simulate-payment/', data);