// services/claimService.ts

import { api } from '@/lib/api';
import { 
  Claim, 
  ClaimDocument, 
  ClaimStatus, 
  PaginatedClaimList, 
  PaginatedClaimDocumentList 
} from '@/types/api';

// ============================================================================
// --- TYPES & INTERFACES ---
// ============================================================================

export interface ClaimFilterParams {
  page?: number;
  page_size?: number;
  search?: string;       // Fuzzy search (policy #, name, etc.)
  ordering?: string;     // e.g. "-created_at"
  status?: ClaimStatus;  // Filter by specific status
  claimant?: string;     // UUID of the customer
  
  // Specific filters supported by backend
  claim_number?: string;
  policy_number?: string;
  min_estimated_loss?: number;
  max_estimated_loss?: number;
  date_of_loss_after?: string;  // YYYY-MM-DD
  date_of_loss_before?: string; // YYYY-MM-DD
}

export interface CreateClaimRequest {
  policy: string;         // UUID
  claimant: string;       // UUID
  date_of_loss: string;   // YYYY-MM-DD
  loss_description: string;
  estimated_loss_amount?: number;
}

export interface UpdateClaimRequest {
  date_of_loss?: string;
  loss_description?: string;
  estimated_loss_amount?: number;
}

export interface SettleClaimRequest {
  settled_amount: string | number;
}

// ============================================================================
// --- CORE CLAIM OPERATIONS (CRUD) ---
// ============================================================================

/**
 * Fetch a paginated list of claims with optional filtering.
 */
export const getClaims = (params: ClaimFilterParams = {}) => {
  return api.get<PaginatedClaimList>('/claims/claims/', { params });
};

/**
 * Fetch a single claim by its ID.
 */
export const getClaimById = (id: string) => {
  if (!id) return Promise.reject(new Error('Claim ID is required'));
  return api.get<Claim>(`/claims/claims/${id}/`);
};

/**
 * Create a new claim (First Notice of Loss).
 */
export const createClaim = (data: CreateClaimRequest) => {
  return api.post<Claim>('/claims/claims/', data);
};

/**
 * Update details of an existing claim (e.g., description, estimate).
 */
export const updateClaim = (id: string, data: UpdateClaimRequest) => {
  return api.patch<Claim>(`/claims/claims/${id}/`, data);
};

/**
 * Delete a claim permanently.
 * Restricted to Admins/Managers.
 */
export const deleteClaim = (id: string) => {
  return api.delete(`/claims/claims/${id}/`);
};

// ============================================================================
// --- CLAIM STATE ACTIONS (WORKFLOW) ---
// ============================================================================

/**
 * Move a claim from FNOL -> UNDER_REVIEW.
 * Used to acknowledge a new claim.
 */
export const startReview = (id: string) => {
  return api.post<Claim>(`/claims/claims/${id}/start-review/`, {});
};

/**
 * Move a claim from UNDER_REVIEW/AWAITING_DOCS -> APPROVED.
 * Indicates liability is accepted.
 */
export const approveClaim = (id: string) => {
  return api.post<Claim>(`/claims/claims/${id}/approve/`, {});
};

/**
 * Move a claim from APPROVED -> SETTLED.
 * Sets the final payout amount.
 */
export const settleClaim = (id: string, data: SettleClaimRequest) => {
  return api.post<Claim>(`/claims/claims/${id}/settle/`, data);
};

/**
 * Move a claim to REJECTED.
 * Cannot reject already settled claims.
 */
export const rejectClaim = (id: string) => {
  return api.post<Claim>(`/claims/claims/${id}/reject/`, {});
};

// ============================================================================
// --- CLAIM DOCUMENTS (NESTED) ---
// ============================================================================

/**
 * Fetch all documents for a specific claim.
 */
export const getClaimDocuments = (claimId: string) => {
  return api.get<PaginatedClaimDocumentList>(`/claims/claims/${claimId}/documents/`);
};

/**
 * Upload a document to a specific claim.
 * Uses FormData for file upload.
 */
export const uploadClaimDocument = (claimId: string, formData: FormData) => {
  return api.post<ClaimDocument>(`/claims/claims/${claimId}/documents/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Delete a specific document from a claim.
 */
export const deleteClaimDocument = (claimId: string, documentId: string) => {
  return api.delete(`/claims/claims/${claimId}/documents/${documentId}/`);
};