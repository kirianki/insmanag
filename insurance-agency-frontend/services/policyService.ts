import { api } from '@/lib/api';
import {
  InstallmentPaymentRequest,
  PaginatedPolicyInstallmentList,
  PaginatedPolicyList,
  PaginatedPolicyTypeList,
  Policy,
  PolicyActivationRequest,
  PolicyInstallment,
  PolicyType,
  UnpaidItem,
  SimulatePaymentRequest,
  SimulationResponse,
  PolicyStatus,
  Customer,
  User,
  InsuranceProvider,
  PaginatedCustomerList,
  PaginatedUserList,
  PaginatedInsuranceProviderList,
  InsuranceProviderList,
  PaymentFrequency
} from '@/types/api';

// Define a generic type for any paginated response from your API
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Helper function to automatically fetch all pages from a paginated endpoint.
const fetchAllPages = async <T,>(
  initialUrl: string,
  initialParams?: Record<string, any>
): Promise<T[]> => {
  let allItems: T[] = [];
  let nextUrl: string | null = null;

  try {
    const initialResponse = await api.get<PaginatedResponse<T>>(initialUrl, {
      params: initialParams,
    });

    allItems = initialResponse.data.results || [];
    nextUrl = initialResponse.data.next;

    while (nextUrl) {
      // ✅ FIX: Instead of stripping the string, extract the page number/query string
      // This avoids the "Double API" prefix issue entirely
      const urlObj = new URL(nextUrl);
      const nextParams = Object.fromEntries(urlObj.searchParams.entries());

      // Use the clean initialUrl with the new params (like ?page=2)
      const subsequentResponse = await api.get<PaginatedResponse<T>>(initialUrl, {
        params: { ...initialParams, ...nextParams },
      });

      allItems = allItems.concat(subsequentResponse.data.results || []);
      nextUrl = subsequentResponse.data.next;
    }

    return allItems;
  } catch (error: any) {
    console.error(`Error fetching all pages for ${initialUrl}:`, error);
    return allItems;
  }
};


// ===================================
// --- Policies ---
// ===================================

export interface PolicyFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  status?: PolicyStatus;
  provider?: string;
  policy_type?: string;
  is_installment?: boolean;
  has_vehicle_registration?: boolean;
  start_date?: string;
  end_date?: string;
  customer?: string;
}

export const getPolicies = (params: PolicyFilterParams = {}) => {
  return api.get<PaginatedPolicyList>('/policies/', { params });
};

export const getPolicyById = (id: string) => {
  return api.get<Policy>(`/policies/${id}/`);
};

export interface CreatePolicyRequest {
  customer: string;
  agent: string;
  provider: string;
  policy_type: string;
  premium_amount: string;
  policy_start_date: string;
  policy_end_date: string;
  vehicle_registration_number?: string;
  is_installment?: boolean;
  installment_plan?: Array<{
    due_date: string;
    amount: string;
  }>;
  sum_insured?: string;
  deductible?: string;
  payment_frequency?: PaymentFrequency;
  next_due_date?: string;
  additional_details?: Record<string, any>;
}

export const createPolicy = (data: Partial<Policy>) =>
  api.post<Policy>('/policies/', data);

export const createPolicyEnhanced = (data: CreatePolicyRequest) =>
  api.post<Policy>('/policies/', data);

export const updatePolicy = (id: string, data: Partial<Policy>) => {
  return api.patch<Policy>(`/policies/${id}/`, data);
};

export const updatePolicyStatus = (id: string, status: PolicyStatus) => {
  return api.post<Policy>(`/policies/${id}/update-status/`, { status });
};

export const deletePolicy = (id: string) =>
  api.delete(`/policies/${id}/`);

export const activatePolicy = (id: string, data: PolicyActivationRequest) =>
  api.post<Policy>(`/policies/${id}/activate/`, data);

export interface EnhancedPolicyActivationRequest extends PolicyActivationRequest {
  policy_start_date?: string;
  policy_end_date?: string;
}

export const activatePolicyEnhanced = (id: string, data: EnhancedPolicyActivationRequest) => {
  return api.post<Policy>(`/policies/${id}/activate/`, data);
};

export interface RecurringPaymentRequest {
  amount: string;
  transaction_reference?: string;
}

export const recordRecurringPayment = (policyId: string, data: RecurringPaymentRequest) => {
  return api.post<Policy>(`/policies/${policyId}/record-recurring-payment/`, data);
};

export const getRecentPolicies = (limit: number = 5) => {
  return api.get<PaginatedPolicyList>('/policies/', {
    params: { ordering: '-created_at', page_size: limit }
  });
};

export const getPolicyStatistics = () =>
  api.get('/policies/statistics/');

// ===================================
// --- Installments ---
// ===================================

export const getInstallmentsForPolicy = (policyId: string, page = 1) =>
  api.get<PaginatedPolicyInstallmentList>(`/policies/${policyId}/installments/`, { params: { page } });

export const recordInstallmentPayment = (policyId: string, installmentId: string, data: InstallmentPaymentRequest) =>
  api.post<PolicyInstallment>(`/policies/${policyId}/installments/${installmentId}/pay/`, data);

export const getInstallmentById = (policyId: string, installmentId: string) =>
  api.get<PolicyInstallment>(`/policies/${policyId}/installments/${installmentId}/`);

// ===================================
// --- Policy Types (scoped to Agency) ---
// ===================================

export interface PolicyTypeFilterParams {
  page?: number;
  search?: string;
  is_active?: boolean;
  payment_structure?: string;
  requires_vehicle_reg?: boolean;
  page_size?: number;
}

export const getPolicyTypes = (agencyId: string, params: PolicyTypeFilterParams = {}) => {
  return api.get<PaginatedPolicyTypeList>(`/agencies/${agencyId}/policy-types/`, { params });
};

export const getPolicyTypesExtended = (agencyId: string, params?: { page?: number; is_active?: boolean; page_size?: number }) => {
  return api.get<PaginatedPolicyTypeList>(`/agencies/${agencyId}/policy-types/`, { params });
};

export const createPolicyType = (agencyId: string, data: Partial<PolicyType>) =>
  api.post<PolicyType>(`/agencies/${agencyId}/policy-types/`, data);

export const updatePolicyType = (agencyId: string, typeId: string, data: Partial<PolicyType>) =>
  api.patch<PolicyType>(`/agencies/${agencyId}/policy-types/${typeId}/`, data);

export const deletePolicyType = (agencyId: string, typeId: string) =>
  api.delete(`/agencies/${agencyId}/policy-types/${typeId}/`);

// =======================================================
// --- Unpaid Items & Unified Payment Simulation ---
// =======================================================

export interface UnpaidItemsFilterParams {
  search?: string;
  ordering?: string;
  item_type?: 'POLICY' | 'INSTALLMENT';
}

export const getUnpaidItems = (params: UnpaidItemsFilterParams = {}) => {
  return api.get<UnpaidItem[]>('/unpaid-items/', { params });
};

export const simulatePayment = (data: SimulatePaymentRequest) => {
  return api.post<SimulationResponse>('/unpaid-items/simulate-payment/', data);
};

// ===================================
// --- Insurance Providers ---
// ===================================

export const getInsuranceProviders = (params?: { is_active?: boolean; search?: string; page_size?: number }) =>
  api.get<PaginatedInsuranceProviderList>('/insurance-providers/', { params });

export const getInsuranceProviderById = (id: string) =>
  api.get<InsuranceProvider>(`/insurance-providers/${id}/`);

// ===================================
// --- Dropdown Data Services ---
// ===================================

export interface DropdownData {
  customers: Customer[];
  agents: User[];
  providers: InsuranceProviderList[];
  policyTypes: PolicyType[];
}

export const getCreatePolicyDropdownData = async (agencyId: string): Promise<DropdownData> => {
  try {
    const results = await Promise.allSettled([
      fetchAllPages<Customer>('/customers/', { agency_id: agencyId }),
      fetchAllPages<User>('/accounts/users/', { agency: agencyId }),
      fetchAllPages<InsuranceProviderList>('/insurance-providers/', { is_active: true }),
      fetchAllPages<PolicyType>(`/agencies/${agencyId}/policy-types/`, { is_active: true }),
    ]);

    const getDataFromResult = <T,>(result: PromiseSettledResult<T[]>, index: number): T[] => {
      if (result.status === 'fulfilled') return result.value;
      if (result.status === 'rejected') console.error(`API call for dropdown item ${index} failed:`, result.reason?.message || result.reason);
      return [];
    };

    return {
      customers: getDataFromResult(results[0], 0),
      agents: getDataFromResult(results[1], 1),
      providers: getDataFromResult(results[2], 2),
      policyTypes: getDataFromResult(results[3], 3),
    };
  } catch (error) {
    console.error('Error in getCreatePolicyDropdownData:', error);
    return { customers: [], agents: [], providers: [], policyTypes: [] };
  }
};

// --- THIS IS THE CORRECT, EFFICIENT FUNCTION FOR THE TOOLBAR ---
export interface ToolbarDropdownData {
  providers: InsuranceProviderList[];
  policyTypes: PolicyType[];
}
export const getToolbarDropdownData = async (agencyId: string): Promise<ToolbarDropdownData> => {
  try {
    const results = await Promise.allSettled([
      fetchAllPages<InsuranceProviderList>('/insurance-providers/', { is_active: true }),
      fetchAllPages<PolicyType>(`/agencies/${agencyId}/policy-types/`, { is_active: true }),
    ]);
    const getDataFromResult = <T,>(result: PromiseSettledResult<T[]>): T[] => {
      if (result.status === 'fulfilled') return result.value;
      console.error(`[Service] Toolbar API call failed:`, (result as PromiseRejectedResult).reason);
      return [];
    };
    return {
      providers: getDataFromResult(results[0]),
      policyTypes: getDataFromResult(results[1]),
    };
  } catch (error) {
    console.error('Critical error in getToolbarDropdownData:', error);
    return { providers: [], policyTypes: [] };
  }
};


export const getCustomers = (params?: { agency_id?: string; page_size?: number; search?: string }) =>
  api.get<PaginatedCustomerList>('/customers/', { params });

export const getUsers = (params?: { agency?: string; page_size?: number; search?: string; branch?: string; paginated?: boolean }) =>
  api.get<PaginatedUserList>('/accounts/users/', { params });

export const getAgencyUsers = (agencyId: string, params?: { page_size?: number; search?: string }) =>
  api.get<PaginatedUserList>('/accounts/users/', { params: { ...params, agency: agencyId } });

// ===================================
// --- Customer Services ---
// ===================================

export const getCustomerById = (id: string) =>
  api.get<Customer>(`/customers/${id}/`);

export const createCustomer = (data: Partial<Customer>) =>
  api.post<Customer>('/customers/', data);

export const updateCustomer = (id: string, data: Partial<Customer>) =>
  api.patch<Customer>(`/customers/${id}/`, data);

// ===================================
// --- Quick Create Services ---
// ===================================

export interface QuickCreateCustomerRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  id_number?: string;
}

export const quickCreateCustomer = (data: QuickCreateCustomerRequest) =>
  api.post<Customer>('/customers/', data);

// ===================================
// --- Export as named object ---
// ===================================

const policyService = {
  getPolicies,
  getPolicyById,
  createPolicy,
  createPolicyEnhanced,
  updatePolicy,
  updatePolicyStatus,
  deletePolicy,
  activatePolicy,
  activatePolicyEnhanced,
  recordRecurringPayment,
  getRecentPolicies,
  getPolicyStatistics,
  getInstallmentsForPolicy,
  recordInstallmentPayment,
  getInstallmentById,
  getPolicyTypes,
  getPolicyTypesExtended,
  createPolicyType,
  updatePolicyType,
  deletePolicyType,
  getUnpaidItems,
  simulatePayment,
  getInsuranceProviders,
  getInsuranceProviderById,
  getCreatePolicyDropdownData,
  getToolbarDropdownData, // Export the new function
  getCustomers,
  getUsers,
  getAgencyUsers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  quickCreateCustomer,
};

export default policyService;