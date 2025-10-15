// types/index.ts
/**
 * Complete TypeScript type definitions for the Insurance Agency API.
 * Based on OpenAPI 3.0.3 specification with all schema components resolved.
 */

// ============================================================================
// AUTH & USER TYPES
// ============================================================================

export interface UserProfile {
  phone_number: string | null;
  profile_picture: string | null;
  bio: string | null;
}

export interface UserNested {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface UserBranchDetail {
  id: string;
  branch_name: string;
}

export interface User extends UserNested {
  password?: string; // Write-only
  agency: string | null;
  branch: string | null;
  manager: string | null;
  profile: UserProfile;
  groups?: number[]; // Write-only
  roles: string[];
  agency_detail: Agency;
  created_at?: string;
  branch_detail?: UserBranchDetail;  // New: nested branch info
}

export type UserRole = 'Superuser' | 'Agency Admin' | 'Branch Manager' | 'Agent';

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface TokenObtainRequest {
  email: string;
  password: string;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
}

// ============================================================================
// AGENCY & BRANCH TYPES
// ============================================================================

export interface AgencyBranch {
  id: string;
  branch_name: string;
  branch_code: string | null;
  address: string | null;
  city: string | null;
  agency: string; // UUID (read-only)
}

export interface Agency {
  id: string;
  agency_name: string;
  agency_code: string;
  mpesa_shortcode: string | null;
  branches: AgencyBranch[];
}

export interface AgencyOnboardingRequest {
  agency_name: string;
  agency_code: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface AgencyOnboardingResponse {
  agency: {
    id: string;
    agency_name: string;
    agency_code: string;
  };
  admin_user: User;
}

// ============================================================================
// PERMISSION & ROLE TYPES
// ============================================================================

export interface Permission {
  id: number;
  name: string;
  codename: string;
}

export interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

// ============================================================================
// CUSTOMER & DOCUMENT TYPES
// ============================================================================

export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Customer {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  id_number: string | null;
  assigned_agent: UserNested;
  kyc_status: KycStatus;
  kyc_verified_by: UserNested;
  agency: string; // UUID (read-only)
  agency_name: string;
  branch: string | null; // UUID (read-only)
  branch_name: string;
  documents: CustomerDocument[];
  created_at: string;
}

export interface CustomerDocument {
  id: string;
  document_type: string;
  file: string; // URI
  verification_status: VerificationStatus;
  verified_by: UserNested;
  created_at: string;
}

export interface CustomerPayment {
  id: string;
  policy: string; // UUID
  customer: string; // UUID
  amount: string; // Decimal
  mpesa_reference: string;
  payment_date: string; // DateTime
  policy_number: string;
  customer_name: string;
}

// ============================================================================
// LEAD TYPES
// ============================================================================

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'CONVERTED' | 'LOST';
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'WALK_IN' | 'COLD_CALL' | 'OTHER';

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  status: LeadStatus;
  source: LeadSource | null;
  notes: string | null;
  assigned_agent: UserNested;
  agency: string; // UUID (read-only)
  agency_name: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INSURANCE PROVIDER TYPES
// ============================================================================

export interface InsuranceProvider {
  id: string;
  name: string;
  short_name: string;
  registration_number: string;
  is_active: boolean;
  email: string;
  phone_number: string;
  alternative_phone: string | null;
  fax_number: string | null;
  website: string | null;
  physical_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  postal_address: string | null;
  contact_person_name: string | null;
  contact_person_email: string | null;
  contact_person_phone: string | null;
  claims_email: string | null;
  claims_phone: string | null;
  commission_rate: string | null; // Decimal
  notes: string | null;
  logo: string | null; // URI
}

export interface InsuranceProviderList {
  id: string;
  name: string;
  short_name: string;
  is_active: boolean;
  phone_number: string;
  email: string;
}

// ============================================================================
// POLICY TYPE TYPES
// ============================================================================

export interface PolicyType {
  id: string;
  name: string;
  requires_vehicle_reg: boolean;
  is_active: boolean;
  agency: string; // UUID (read-only)
  agency_name: string;
}

// ============================================================================
// POLICY & INSTALLMENT TYPES
// ============================================================================

export type PolicyStatus = 'AWAITING_PAYMENT' | 'PAID_PENDING_ACTIVATION' | 'ACTIVE' | 'ACTIVE_INSTALLMENT' | 'LAPSED' | 'EXPIRED' | 'CANCELLED';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface InstallmentPlan {
  due_date: string; // Date
  amount: string; // Decimal
}

export interface PolicyInstallment {
  id: string;
  due_date: string; // Date
  amount: string; // Decimal
  status: InstallmentStatus;
  status_display: string;
  paid_on: string | null; // Date
  transaction_reference: string | null;
}

export interface InstallmentPaymentRequest {
  paid_on: string; // Date
  transaction_reference: string;
}

export interface SimpleCustomer {
  id: string;
  name: string;
  phone: string;
}

export interface Policy {
  id: string;
  policy_number: string;
  status: PolicyStatus;
  status_display: string;
  total_premium_amount: string; // FIX: Renamed from premium_amount
  is_installment: boolean;
  policy_start_date: string; // Date
  policy_end_date: string; // Date
  vehicle_registration_number: string | null;
  insurance_certificate_number: string | null;
  customer_detail: SimpleCustomer; // FIX: Correctly typed as a nested object
  agent_detail: User;
  provider_detail: InsuranceProviderList;
  policy_type_detail: PolicyType;
  customer: string; // UUID (write-only)
  agent: string; // UUID (write-only)
  provider: string; // UUID (write-only)
  policy_type: string; // UUID (write-only)
  installments: PolicyInstallment[];
  installment_plan?: InstallmentPlan[]; // Write-only
  created_at: string;
  updated_at: string;
}

export interface PolicyList {
  id: string;
  policy_number: string;
  status: PolicyStatus;
  status_display: string;
  customer_name: string;
  provider_name: string;
  agent_name: string;
  total_premium_amount: string; // Decimal
  is_installment: boolean;
  policy_start_date: string; // Date
  policy_end_date: string; // Date
  created_at: string;
}

export interface PolicyActivationRequest {
  insurance_certificate_number: string;
}

// ============================================================================
// CLAIM TYPES
// ============================================================================

export type ClaimStatus = 'FNOL' | 'UNDER_REVIEW' | 'AWAITING_DOCS' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'CLOSED';

export interface ClaimDocument {
  id: string;
  document_type: string; // e.g., Police Report, Photo of Damage
  file: string; // URI
  uploaded_by_email: string;
  created_at: string;
}

export interface Claim {
  id: string;
  claim_number: string;
  status: ClaimStatus;
  status_display: string;
  date_of_loss: string; // Date
  loss_description: string;
  estimated_loss_amount: string | null; // Decimal
  settled_amount: string | null; // Decimal (read-only)
  policy: string; // UUID
  claimant: string; // UUID
  policy_number: string;
  claimant_name: string;
  reported_by_email: string;
  documents: ClaimDocument[];
  created_at: string;
}

export interface SettleClaimRequest {
  settled_amount: string; // Decimal
}

// ============================================================================
// COMMISSION TYPES
// ============================================================================

export type PayoutBasis = 'AGENCY_COMMISSION' | 'TOTAL_PREMIUM';
export type CommissionType = 'NEW_BUSINESS' | 'RENEWAL';
export type StaffCommissionType = 'PAYOUT' | 'UPLINE' | 'BONUS' | 'CLAWBACK';
export type StaffCommissionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'BATCHED' | 'PAID' | 'REVERSED';
export type PayoutBatchStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ProviderCommissionStructure {
  id: string;
  provider: string; // UUID
  policy_type: string; // UUID
  commission_type: CommissionType;
  rate_percentage: string; // Decimal
}

export interface StaffCommissionRule {
  id: string;
  user: string; // UUID
  policy_type: string | null; // UUID (optional)
  payout_basis: PayoutBasis;
  rate_percentage: string; // Decimal
}

export interface StaffCommission {
  id: string;
  agent: string; // UUID
  policy: string | null; // UUID
  commission_type: StaffCommissionType;
  commission_amount: string; // Decimal
  status: StaffCommissionStatus;
  payout_batch: string | null; // UUID
  created_at: string;
  agent_email: string;
  policy_number: string;
}

export interface StaffCommissionApproveRequest {
  id: string;
}

export interface PayoutBatch {
  id: string;
  status: PayoutBatchStatus;
  created_at: string;
  initiated_by: string; // UUID
  agency: string; // UUID
  initiated_by_email: string;
  agency_name: string;
  total_amount: string; // Decimal
  commission_count: number;
}

export interface SimulatePaymentRequest {
  policy_id: string; // UUID
}

export interface SimulatePaymentResponse {
  status: string; // Usually 'success'
  message: string;
  payload: Record<string, unknown>;
}

// ============================================================================
// RENEWAL TYPES
// ============================================================================

export interface Renewal {
  id: string;
  customer: string; // UUID
  customer_name: string;
  created_by: UserNested;
  current_insurer: string;
  policy_type_description: string;
  renewal_date: string; // Date
  premium_estimate: string | null; // Decimal
  notes: string | null;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  policy: string | null; // UUID
  created_at: string;
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface SystemLog {
  id: number;
  agency: string; // UUID
  agency_name: string;
  branch: string | null; // UUID
  branch_name: string;
  user: string | null; // UUID
  user_email: string;
  action_type: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// ============================================================================
// DASHBOARD & ANALYTICS TYPES
// ============================================================================

export interface Scope {
  level: string; // 'agent', 'branch', 'agency'
  name: string;
}

export interface KPIs {
  total_premium_written: string;
  policies_sold: number;
  commission_earned_approved: string;
  commission_earned_pending: string;
  lead_conversion_rate_percent: number;
  claims_filed_count: number;
  claims_total_value: string;
}

export interface ExpiringPolicy {
  policy_id: string;
  policy_number: string;
  customer_name: string;
  expiry_date: string; // ISO date
}

export interface RecentPolicy {
  policy_id: string;
  policy_number: string;
  customer_name: string;
  premium: string;
  date: string; // ISO date
}

export interface RecentClaim {
  claim_id: string;
  claim_number: string;
  policy_number: string;
  customer_name: string;
  date: string; // ISO date
}

export interface PerformanceItem {
  name: string;
  total_premium: string;
  policies_count: number;
}

export interface PerformanceBreakdown {
  name: string;
  total_premium: string;
  policies_count: number;
}

export interface TopPerformer {
  agent_id: string;
  agent_name: string;
  total_premium: string;
  policies_sold: number;
}

export interface DashboardData {
  scope: Scope;
  kpis: KPIs;
  actionable_insights: {
    expiring_policies_in_30_days: ExpiringPolicy[];
  };
  recent_activity: {
    policies_sold: RecentPolicy[];
    claims_filed: RecentClaim[];
  };
  performance_breakdowns?: {
    by_policy_type: PerformanceBreakdown[];
    by_provider: PerformanceBreakdown[];
    by_branch?: PerformanceBreakdown[];
  };
  top_performers?: {
    agents_by_premium: TopPerformer[];
  };
}

// ============================================================================
// PAGINATED RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginatedNotifications extends PaginatedResponse<Notification> {
  unread_count: number;
}

// Type aliases for common paginated responses
export type PaginatedUsers = PaginatedResponse<User>;
export type PaginatedAgencies = PaginatedResponse<Agency>;
export type PaginatedBranches = PaginatedResponse<AgencyBranch>;
export type PaginatedCustomers = PaginatedResponse<Customer>;
export type PaginatedLeads = PaginatedResponse<Lead>;
export type PaginatedPolicies = PaginatedResponse<PolicyList>;
export type PaginatedClaims = PaginatedResponse<Claim>;
export type PaginatedInsuranceProviders = PaginatedResponse<InsuranceProviderList>;
export type PaginatedPolicyTypes = PaginatedResponse<PolicyType>;
export type PaginatedRenewals = PaginatedResponse<Renewal>;
export type PaginatedPermissions = PaginatedResponse<Permission>;
export type PaginatedRoles = PaginatedResponse<Role>;
export type PaginatedCustomerDocuments = PaginatedResponse<CustomerDocument>;
export type PaginatedClaimDocuments = PaginatedResponse<ClaimDocument>;
export type PaginatedCustomerPayments = PaginatedResponse<CustomerPayment>;
export type PaginatedStaffCommissions = PaginatedResponse<StaffCommission>;
export type PaginatedStaffCommissionRules = PaginatedResponse<StaffCommissionRule>;
export type PaginatedProviderCommissionStructures = PaginatedResponse<ProviderCommissionStructure>;
export type PaginatedPayoutBatches = PaginatedResponse<PayoutBatch>;
export type PaginatedPolicyInstallments = PaginatedResponse<PolicyInstallment>;
export type PaginatedSystemLogs = PaginatedResponse<SystemLog>;

// ============================================================================
// REPORT TYPES
// ============================================================================

export type ReportType = 
  | 'sales-summary'
  | 'commissions-summary'
  | 'leads-summary'
  | 'policies-detail'
  | 'customers-detail'
  | 'claims-detail';

export interface ReportParams {
  report_type: ReportType;
  format?: 'json' | 'csv';
  agent_id?: string;
  branch_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  kyc_status?: string;
}

// ============================================================================
// API ERROR TYPES
// ============================================================================

export interface APIError {
  error: string;
  message?: string;
  details?: Record<string, string[]>;
  status_code: number;
}

// ============================================================================
// REQUEST/RESPONSE HELPERS
// ============================================================================

export interface CreateCustomerRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  id_number?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {}

export interface CreatePolicyRequest {
  customer: string; // UUID
  agent: string; // UUID
  provider: string; // UUID
  policy_type: string; // UUID
  total_premium_amount: string;
  is_installment: boolean;
  policy_start_date: string; // Date
  policy_end_date: string; // Date
  vehicle_registration_number?: string;
  installment_plan?: InstallmentPlan[];
}

export interface CreateLeadRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  status: LeadStatus;
  source?: LeadSource;
  notes?: string;
}

export interface CreateClaimRequest {
  policy: string; // UUID
  claimant: string; // UUID
  date_of_loss: string; // Date
  loss_description: string;
  estimated_loss_amount?: string;
}

export interface CreateRenewalRequest {
  customer: string; // UUID
  current_insurer: string;
  policy_type_description: string;
  renewal_date: string; // Date
  premium_estimate?: string;
  notes?: string;
}