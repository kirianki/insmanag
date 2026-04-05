// services/documentService.ts

import { api } from '@/lib/api';
import { CustomerDocument, PaginatedResponse, VerificationStatus } from '@/types/api';

// Define a filter interface for fetching documents
export interface DocumentFilterParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  verification_status?: VerificationStatus; // e.g., 'PENDING'
  customer__id?: string; // To get documents for a specific customer
}

// This endpoint is for getting the flat list of documents. It is correct.
export const getDocuments = (params: DocumentFilterParams = {}) => {
  return api.get<PaginatedResponse<CustomerDocument>>('/documents/', { params });
};

/**
 * Verifies a specific customer document.
 * --- REFACTORED: This now calls the simpler, non-nested endpoint. ---
 * @param documentId The ID of the document to verify.
 */
export const verifyDocument = (documentId: string) => {
  return api.post<CustomerDocument>(`/documents/${documentId}/verify/`, {});
};

/**
 * Rejects a specific customer document.
 * --- REFACTORED: This now calls the simpler, non-nested endpoint. ---
 * @param documentId The ID of the document to reject.
 */
export const rejectDocument = (documentId: string) => {
  return api.post<CustomerDocument>(`/documents/${documentId}/reject/`, {});
};