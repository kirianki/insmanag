// services/accountsService.ts

import { api } from '@/lib/api';
import { 
  Agency, 
  AgencyBranch, 
  AgencyOnboarding, 
  ChangePassword, 
  PaginatedAgencyBranchList, 
  PaginatedAgencyList, 
  PaginatedRoleList,
  PaginatedUserList, 
  User 
} from '@/types/api';

// ===================================
// --- Users ---
// ===================================

/**
 * Get the authenticated user's profile
 * Corresponds to: GET /api/v1/accounts/users/me/
 */
export const getMe = () => 
  api.get<User>('/accounts/users/me/');

/**
 * Update the authenticated user's profile.
 * Handles both JSON and FormData submissions properly.
 * When uploading files, FormData must be used with multipart/form-data.
 * @param formData The FormData object containing the user's profile data.
 */
export const updateMe = (formData: FormData) => {
  return api.patch<User>('/accounts/users/me/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Get all users with optional filters
 * Corresponds to: GET /api/v1/accounts/users/
 */
export const getUsers = (params: { page?: number; agency?: string; branch?: string } = {}) => 
  api.get<PaginatedUserList>('/accounts/users/', { params });

/**
 * Get a single user by ID
 * Corresponds to: GET /api/v1/accounts/users/{id}/
 */
export const getUserById = (id: string) => 
  api.get<User>(`/accounts/users/${id}/`);

/**
 * Create a new user
 * Corresponds to: POST /api/v1/accounts/users/
 */
export const createUser = (data: Partial<User>) => 
  api.post<User>('/accounts/users/', data);

/**
 * Update an existing user
 * Corresponds to: PATCH /api/v1/accounts/users/{id}/
 */
export const updateUser = (id: string, data: Partial<User>) => 
  api.patch<User>(`/accounts/users/${id}/`, data);

/**
 * Delete a user
 * Corresponds to: DELETE /api/v1/accounts/users/{id}/
 */
export const deleteUser = (id: string) => 
  api.delete(`/accounts/users/${id}/`);

// ===================================
// --- Roles & Permissions ---
// ===================================

/**
 * Get all available user roles (groups) in the system.
 * Corresponds to: GET /api/v1/accounts/roles/
 */
export const getRoles = () => 
  api.get<PaginatedRoleList>('/accounts/roles/');

// ===================================
// --- Agencies ---
// ===================================

/**
 * Get all agencies (paginated)
 * Corresponds to: GET /api/v1/accounts/agencies/
 */
export const getAgencies = (page = 1) => 
  api.get<PaginatedAgencyList>('/accounts/agencies/', { params: { page } });

/**
 * Get a single agency by ID
 * Corresponds to: GET /api/v1/accounts/agencies/{id}/
 */
export const getAgencyById = (id: string) => 
  api.get<Agency>(`/accounts/agencies/${id}/`);

/**
 * Update an existing agency
 * Corresponds to: PATCH /api/v1/accounts/agencies/{id}/
 */
export const updateAgency = (id: string, data: Partial<Agency>) => 
  api.patch<Agency>(`/accounts/agencies/${id}/`, data);

/**
 * Delete an agency
 * Corresponds to: DELETE /api/v1/accounts/agencies/{id}/
 */
export const deleteAgency = (id: string) => 
  api.delete(`/accounts/agencies/${id}/`);

/**
 * Onboard a new agency (creates agency + admin user)
 * Corresponds to: POST /api/v1/accounts/onboarding/agency/
 */
export const onboardAgency = (data: AgencyOnboarding) => 
  api.post('/accounts/onboarding/agency/', data);

// ===================================
// --- Branches ---
// ===================================

/**
 * Get all branches for a specific agency
 * Corresponds to: GET /api/v1/accounts/agencies/{agency_pk}/branches/
 */
export const getBranches = (agencyId: string, page = 1) => 
  api.get<PaginatedAgencyBranchList>(`/accounts/agencies/${agencyId}/branches/`, { params: { page } });

/**
 * Create a new branch for an agency
 * Corresponds to: POST /api/v1/accounts/agencies/{agency_pk}/branches/
 */
export const createBranch = (agencyId: string, data: Partial<AgencyBranch>) => 
  api.post<AgencyBranch>(`/accounts/agencies/${agencyId}/branches/`, data);

/**
 * Update an existing branch
 * Corresponds to: PATCH /api/v1/accounts/agencies/{agency_pk}/branches/{id}/
 */
export const updateBranch = (agencyId: string, branchId: string, data: Partial<AgencyBranch>) => 
  api.patch<AgencyBranch>(`/accounts/agencies/${agencyId}/branches/${branchId}/`, data);

/**
 * Delete a branch
 * Corresponds to: DELETE /api/v1/accounts/agencies/{agency_pk}/branches/{id}/
 */
export const deleteBranch = (agencyId: string, branchId: string) => 
  api.delete(`/accounts/agencies/${agencyId}/branches/${branchId}/`);

// ===================================
// --- Authentication ---
// ===================================

/**
 * Change the authenticated user's password
 * Corresponds to: PUT /api/v1/accounts/auth/change-password/
 */
export const changePassword = (data: ChangePassword) => 
  api.put('/accounts/auth/change-password/', data);