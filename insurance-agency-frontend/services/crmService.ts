// services/crmService.ts

import { api } from '@/lib/api';
// Make sure LeadStatus is imported from your types
import { Customer, Lead, LeadStatus, PaginatedLeadList, PaginatedRenewalList, Renewal } from '@/types/api';

// 1. RENAME the interface to be more generic, as it's used for both create and update.
// 2. ADD the optional 'status' field to this interface.
export interface LeadPayload {
  first_name?: string; // Make fields optional for update operations
  last_name?: string;
  phone?: string;
  email?: string;
  source?: 'WEBSITE' | 'REFERRAL' | 'WALK_IN' | 'COLD_CALL' | 'OTHER';
  source_detail?: string;
  preferred_contact_method?: 'PHONE' | 'EMAIL' | 'WHATSAPP';
  next_follow_up_at?: string;
  notes?: string;
  consent_marketing?: boolean;
  tags?: string[];
  status?: LeadStatus; // <-- ADD THIS LINE
}


// --- Leads ---
export const getLeads = (page = 1) => api.get<PaginatedLeadList>('/leads/', { params: { page } });
export const getLeadById = (id: string) => api.get<Lead>(`/leads/${id}/`);

// 3. UPDATE createLead and updateLead to use the new, more flexible type.
// For createLead, you'll still pass the same data, and it will match the new type.
export const createLead = (data: LeadPayload) => api.post<Lead>('/leads/', data);

// This now correctly allows passing a 'status' object.
export const updateLead = (id: string, data: LeadPayload) => api.patch<Lead>(`/leads/${id}/`, data);

export const deleteLead = (id: string) => api.delete(`/leads/${id}/`);
export const convertLeadToCustomer = (id: string) => api.post<Customer>(`/leads/${id}/convert/`, {});


// --- Renewals ---
// (The rest of the file is unchanged)
export const getRenewals = (params: { page?: number; customer?: string } = {}) => {
  return api.get<PaginatedRenewalList>('/renewals/', { params });
};
export const createRenewal = (data: Partial<Renewal>) => api.post<Renewal>('/renewals/', data);
export const updateRenewal = (id: string, data: Partial<Renewal>) => api.patch<Renewal>(`/renewals/${id}/`, data);
export const deleteRenewal = (id: string) => api.delete(`/renewals/${id}/`);