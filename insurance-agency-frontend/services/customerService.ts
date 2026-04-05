// lib/services/customerService.ts

import { api } from '@/lib/api';
import { Customer, CustomerDocument, PaginatedCustomerList, PaginatedCustomerDocumentList } from '@/types/api';

// Define a filter interface for type safety
export interface CustomerFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

// --- Customers ---
export const getCustomers = (params: CustomerFilterParams = {}) =>
  api.get<PaginatedCustomerList>(`/customers/`, { params });

export const getCustomerById = (id: string) => api.get<Customer>(`/customers/${id}/`);

// The data type for creation is more specific
export const createCustomer = (data: {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  id_number?: string;
}) => api.post<Customer>('/customers/', data);

export const updateCustomer = (id: string, data: Partial<Customer>) => api.patch<Customer>(`/customers/${id}/`, data);

export const deleteCustomer = (id: string) => api.delete(`/customers/${id}/`);

// --- Customer Documents ---
export const getCustomerDocuments = (customerId: string, page = 1) => api.get<PaginatedCustomerDocumentList>(`/customers/${customerId}/documents/`, { params: { page } });
export const uploadCustomerDocument = (customerId: string, formData: FormData) => api.post<CustomerDocument>(`/customers/${customerId}/documents/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteCustomerDocument = (customerId: string, documentId: string) => api.delete(`/customers/${customerId}/documents/${documentId}/`);

export const verifyCustomerDocument = (customerId: string, documentId: string, notes?: string) => api.post<CustomerDocument>(`/customers/${customerId}/documents/${documentId}/verify/`, { notes });
export const rejectCustomerDocument = (customerId: string, documentId: string, reason: string) => api.post<CustomerDocument>(`/customers/${customerId}/documents/${documentId}/reject/`, { rejection_reason: reason });

// --- Admin ---
export const getAllDocuments = (params: Record<string, unknown> = {}) => api.get<PaginatedCustomerDocumentList>('/documents/', { params });
export const deleteAdminDocument = (id: string) => api.delete(`/documents/${id}/`);