// services/renewalService.ts

import { api } from '@/lib/api';
import { PaginatedRenewalList, Renewal } from '@/types/api';

export interface RenewalFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  customer?: string;
}

// 1. DEFINE the precise "write model" for a renewal.
// This includes only the fields that the client can create or update.
export interface RenewalPayload {
  customer: string; // Required for creation
  renewal_date: string;
  policy_type_description: string;
  current_insurer?: string | null;
  premium_estimate?: string | null;
  vehicle_registration_number?: string | null;
  notes?: string | null;
}

export const getRenewals = (params: RenewalFilterParams = {}) =>
  api.get<PaginatedRenewalList>('/renewals/', { params });

// 2. USE the specific RenewalPayload type for creation.
export const createRenewal = (data: RenewalPayload) =>
  api.post<Renewal>('/renewals/', data);

// 3. USE a Partial of the payload for updates, as not all fields may be sent.
export const updateRenewal = (id: string, data: Partial<RenewalPayload>) =>
  api.patch<Renewal>(`/renewals/${id}/`, data);

export const deleteRenewal = (id: string) =>
  api.delete(`/renewals/${id}/`);