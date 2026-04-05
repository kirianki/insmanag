/**
 * ============================================================================
 * THIS IS THE SINGLE SOURCE OF TRUTH FOR API DATA SHAPES
 * ============================================================================
 */

// ============================================================================
// --- SECTION 1: ENUMS ---
// ============================================================================

export type ClaimStatus = 'FNOL' | 'UNDER_REVIEW' | 'AWAITING_DOCS' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'CLOSED';
export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'CONVERTED' | 'LOST';
export type PreferredContactMethod = 'PHONE' | 'EMAIL' | 'WHATSAPP';
export type PayoutBasis = 'AGENCY_COMMISSION' | 'TOTAL_PREMIUM';
export type PayoutBatchStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type PolicyInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type PolicyStatus =
  | 'AWAITING_PAYMENT'
  | 'PARTIALLY_PAID'
  | 'PAID_PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'ACTIVE_INSTALLMENT'
  | 'ACTIVE_RECURRING'
  | 'AT_RISK_MISSING_PAYMENT'
  | 'LAPSED'
  | 'EXPIRED'
  | 'CANCELLED';
export type ProviderCommissionType = 'NEW_BUSINESS' | 'RENEWAL';
export type StaffCommissionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'BATCHED' | 'PAID' | 'REVERSED';
export type StaffCommissionType = 'PAYOUT' | 'UPLINE' | 'BONUS' | 'CLAWBACK';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'WALK_IN' | 'COLD_CALL' | 'OTHER';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'ANNUALLY';

// ============================================================================
// --- SECTION 2: NESTED & UTILITY SCHEMAS ---
// ============================================================================

export interface Choice<T> { value: T; label: string; }
export interface UserProfile { phone_number?: string; profile_picture?: string; bio?: string; }
export interface UserNested { id: string; email: string; first_name?: string; last_name?: string; }
export interface AgencyNested { id: string; agency_name: string; agency_code: string; }
export interface BranchNested { id: string; branch_name: string; branch_code?: string; }
export interface InsuranceProviderNested { id: string; name: string; short_name?: string; }
export interface PolicyTypeNested { id: string; name: string; requires_vehicle_reg?: boolean; }
export interface CustomerNested { id: string; customer_number: string; first_name: string; last_name: string; }

// ============================================================================
// --- SECTION 3: CORE DATA MODELS ---
// ============================================================================

export interface Permission { readonly id: number; name: string; codename: string; }
export interface Role { readonly id: number; name: string; readonly permissions: Permission[]; }
export interface Group { id: number; name: string; }
export interface User { id: string; email: string; first_name?: string; last_name?: string; password?: string; agency?: string; branch?: string; manager?: string; profile: UserProfile; groups?: Group[]; readonly roles: string[]; agency_detail: AgencyNested; branch_detail: BranchNested; }
export interface Agency { id: string; agency_name: string; agency_code: string; mpesa_shortcode?: string; branches: AgencyBranch[]; }
export interface AgencyBranch { id: string; branch_name: string; branch_code?: string; address?: string; city?: string; agency: string; }
export interface CustomerDocument { id: string; customer: CustomerNested; document_type: string; document_number?: string; expiry_date?: string; file: string; verification_status: VerificationStatus; verified_by?: UserNested; notes?: string; is_active?: boolean; created_at: string; }
export interface Customer { id: string; customer_number: string; first_name: string; last_name: string; email?: string; phone: string; id_number?: string; assigned_agent: UserNested; kyc_status: Choice<KycStatus>; kyc_verified_by?: UserNested; agency: string; agency_name: string; branch: string; branch_name: string; documents: CustomerDocument[]; created_at: string; }
export interface PolicyInstallment { id: string; due_date: string; amount: string; status?: PolicyInstallmentStatus; status_display: string; paid_on?: string; transaction_reference?: string; }
export interface InsuranceProviderList { readonly id: string; name: string; short_name: string; is_active: boolean; phone_number: string; email: string; }
export interface Policy {
  id: string;
  policy_number: string;
  status: PolicyStatus;
  status_display: string;
  premium_amount: string;
  is_installment?: boolean;
  policy_start_date: string;
  policy_end_date: string;
  vehicle_registration_number?: string;
  insurance_certificate_number: string;
  customer_detail: { id: string; name: string; phone: string; };
  agent_detail: UserNested;
  provider_detail: InsuranceProviderList;
  policy_type_detail: PolicyType;
  customer: string;
  agent: string;
  provider: string;
  policy_type: string;
  installments: PolicyInstallment[];
  installment_plan?: { due_date: string; amount: string }[];
  created_at: string;
  updated_at: string;
  sum_insured: string | null;
  deductible: string | null;
  amount_paid: string;
  balance_due: string;
  payment_frequency: PaymentFrequency | null;
  next_due_date: string | null;
  additional_details: Record<string, any> | null;
}

export interface PolicyType {
  id: string;
  name: string;
  requires_vehicle_reg?: boolean;
  is_active?: boolean;
  agency: string;
  agency_name: string;
  payment_structure: 'PREMIUM_BASED' | 'RECURRING_FEE';
}

export interface ClaimDocument { id: string; document_type: string; file: string; uploaded_by_email: string; created_at: string; }
export interface Claim { id: string; claim_number: string; status: Choice<ClaimStatus>; status_display: string; date_of_loss: string; loss_description: string; estimated_loss_amount?: string; settled_amount: string; policy: string; claimant: string; policy_number: string; claimant_name: string; reported_by_email: string; documents: ClaimDocument[]; created_at: string; }
export interface Lead { id: string; first_name: string; last_name: string; email?: string; phone: string; status?: LeadStatus; source?: Choice<LeadSource>; notes?: string; preferred_contact_method?: PreferredContactMethod; next_follow_up_at?: string; last_contacted_at?: string; tags?: string[]; consent_marketing?: boolean; source_detail?: string; assigned_agent: UserNested; agency: string; agency_name: string; created_at: string; updated_at: string; }
export interface CustomerPayment { id: string; policy: string; customer: string; amount: string; mpesa_reference: string; payment_date: string; policy_number: string; customer_name: string; }
export interface PayoutBatch { id: string; status: Choice<PayoutBatchStatus>; created_at: string; initiated_by: string; agency: string; initiated_by_email: string; agency_name: string; total_amount: string; commission_count: number; }
export interface ProviderCommissionStructure { id: string; provider: string; policy_type: string; commission_type: ProviderCommissionType; rate_percentage: string; }
export interface StaffCommissionRule { id: string; user: string; policy_type?: string; payout_basis: PayoutBasis; rate_percentage: string; monthly_threshold: string; }
export interface StaffCommission { id: string; agent: string; policy: string; commission_type: Choice<StaffCommissionType>; commission_amount: string; status?: StaffCommissionStatus; payout_batch: string; created_at: string; agent_email: string; policy_number: string; applied_rule_details?: { threshold_applied?: boolean; production_before?: string; commissionable_base?: string;[key: string]: any; }; }
export interface InsuranceProvider { readonly id: string; name: string; short_name: string; registration_number: string; is_active: boolean; email: string; phone_number: string; alternative_phone: string; fax_number: string; website: string; physical_address: string; city: string; postal_code: string; country: string; postal_address: string; contact_person_name: string; contact_person_email: string; contact_person_phone: string; claims_email: string; claims_phone: string; commission_rate: string | null; notes: string; logo: string | null; }
export interface Notification { id: string; message: string; is_read?: boolean; policy: string; created_at: string; }
export interface Renewal { id: string; customer: string; customer_name: string; created_by: UserNested; current_insurer: string; policy_type_description: string; renewal_date: string; premium_estimate?: string; notes?: string; }
export interface SystemLog { id: number; agency: string; agency_name: string; branch: string; branch_name: string; user: string; user_email: string; action_type: string; details: Record<string, unknown>; ip_address: string; created_at: string; }

// ============================================================================
// --- SECTION 4: PAGINATED RESPONSES ---
// ============================================================================

export interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[]; }
export type PaginatedAgencyList = PaginatedResponse<Agency>;
export type PaginatedAgencyBranchList = PaginatedResponse<AgencyBranch>;
export type PaginatedClaimList = PaginatedResponse<Claim>;
export type PaginatedClaimDocumentList = PaginatedResponse<ClaimDocument>;
export type PaginatedCustomerList = PaginatedResponse<Customer>;
export type PaginatedCustomerDocumentList = PaginatedResponse<CustomerDocument>;
export type PaginatedCustomerPaymentList = PaginatedResponse<CustomerPayment>;
export type PaginatedInsuranceProviderList = PaginatedResponse<InsuranceProviderList>;
export type PaginatedLeadList = PaginatedResponse<Lead>;
export type PaginatedNotificationList = PaginatedResponse<Notification>;
export type PaginatedPayoutBatchList = PaginatedResponse<PayoutBatch>;
export type PaginatedPolicyList = PaginatedResponse<PolicyList>;
export type PaginatedPolicyInstallmentList = PaginatedResponse<PolicyInstallment>;
export type PaginatedPolicyTypeList = PaginatedResponse<PolicyType>;
export type PaginatedProviderCommissionStructureList = PaginatedResponse<ProviderCommissionStructure>;
export type PaginatedRenewalList = PaginatedResponse<Renewal>;
export type PaginatedRoleList = PaginatedResponse<Role>;
export type PaginatedStaffCommissionList = PaginatedResponse<StaffCommission>;
export type PaginatedStaffCommissionRuleList = PaginatedResponse<StaffCommissionRule>;
export type PaginatedSystemLogList = PaginatedResponse<SystemLog>;
export type PaginatedUserList = PaginatedResponse<User>;

// ============================================================================
// --- SECTION 5: ANALYTICS & DASHBOARD ---
// ============================================================================

export interface AnalyticsScope { level: 'Agent' | 'Branch' | 'Agency' | 'System'; name: string; id: string | null; }
export interface PeriodStats {
  premium: string;
  policies: number;
  claims_count: number;
  claims_value: string;
  commission_earned: string;
  commission_earned_pending: string;
}

export interface DashboardKPIs {
  total_premium_written: string;
  policies_sold: number;
  commission_earned_approved?: string;
  commission_earned_pending?: string;
  total_agency_commission_earned?: string;
  lead_conversion_rate_percent: number;
  claims_filed_count: number;
  claims_total_value: string;
  mtd: PeriodStats;
  ytd: PeriodStats;
}
export interface ExpiringPolicy { policy_id: string; policy_number: string; customer_name: string; expiry_date: string; }
export interface ExpiringRenewal { renewal_id: string; customer_name: string; customer_id: string; renewal_date: string; policy_type: string; current_insurer: string; }
export interface InstallmentAlert { policy_id: string; installment_id: string; policy_number: string; customer_name: string; due_date: string; amount_due: string; }
export interface UpcomingRecurringPayment { policy_id: string; policy_number: string; customer_name: string; next_due_date: string; amount_due: string; frequency: string; }
export interface RecentPolicy { policy_id: string; policy_number: string; customer_name: string; premium: string; date: string; }
export interface RecentClaim { claim_id: string; claim_number: string; policy_number: string; customer_name: string; date: string; }

export interface PerformanceBreakdown {
  total_premium: string;
  policies_count: number;

  // --- THIS IS THE FIX ---
  // The index signature is updated to allow for `undefined`, which is the type of optional properties.
  [key: string]: string | number | undefined;

  // These properties are now compatible with the updated index signature.
  provider__id?: string;
  policy_type__id?: string;
  branch__id?: string;
}

export interface TopAgent { agent_id: string; agent_name: string; total_premium: string; policies_sold: number; }
export interface AnalyticsDashboardResponse {
  scope: AnalyticsScope;
  kpis: DashboardKPIs;
  actionable_insights: {
    expiring_policies_in_30_days: ExpiringPolicy[];
    upcoming_installments_in_10_days: InstallmentAlert[];
    upcoming_renewals_in_30_days: ExpiringRenewal[];
    upcoming_recurring_payments_in_10_days: UpcomingRecurringPayment[];
  };
  recent_activity: { policies_sold: RecentPolicy[]; claims_filed: RecentClaim[]; };
  performance_breakdowns?: { by_policy_type: PerformanceBreakdown[]; by_provider: PerformanceBreakdown[]; by_branch?: PerformanceBreakdown[]; };
  top_performers?: { agents_by_premium: TopAgent[]; };
  filters_applied: Record<string, string>;
}

export interface ThresholdProgress {
  rule_id: string;
  policy_type_name: string;
  payout_basis: PayoutBasis;
  payout_basis_display: string;
  current_production: string;
  threshold: string;
  remaining: string;
  is_reached: boolean;
  percentage_complete: number;
}

export interface AgentThresholdProgressResponse {
  agent_id: string;
  agent_name: string;
  progress: ThresholdProgress[];
}

// ============================================================================
// --- SECTION 6: POLICY LIST VIEW & FILTERS ---
// ============================================================================

export interface UnpaidItem { item_id: string; item_type: 'POLICY' | 'INSTALLMENT'; policy_number: string; customer_name: string; amount_due: string; due_date: string; }
export interface SimulatePaymentRequest { item_id: string; item_type: 'POLICY' | 'INSTALLMENT'; }
export interface SimulationResponse { message: string; }
export interface PolicyList {
  id: string;
  policy_number?: string;
  status?: PolicyStatus;
  status_display: string;
  customer_name: string;
  provider_name: string;
  agent_name: string;
  premium_amount: string;
  sum_insured: string | null;
  is_installment?: boolean;
  policy_start_date: string;
  policy_end_date: string;
  vehicle_registration_number?: string;
  created_at: string;
}
export interface PolicyFilterParams { page?: number; page_size?: number; search?: string; ordering?: string; status?: PolicyStatus; provider__id?: string; policy_type__id?: string; is_installment?: boolean; }
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
  installment_plan?: Array<{ due_date: string; amount: string; }>;
  sum_insured?: string;
  deductible?: string;
  payment_frequency?: PaymentFrequency;
  next_due_date?: string;
  additional_details?: Record<string, any>;
}

// ============================================================================
// --- SECTION 7: ACTION & FORM SCHEMAS ---
// ============================================================================

export interface MyTokenObtainPair { email: string; password?: string; access?: string; refresh?: string; }
export interface TokenRefresh { refresh: string; access?: string; }
export interface ChangePassword { old_password: string; new_password: string; }
export interface AgencyOnboarding { agency_name: string; agency_code: string; first_name: string; last_name: string; email: string; password: string; }
export interface SimulatePaymentResponse { policy_id: string; simulated_amount: string; currency: string; payment_due_date: string; message?: string; }
export interface SettleClaimRequest { settled_amount: string; }
export interface InstallmentPaymentRequest { paid_on: string; transaction_reference?: string; }
export interface PolicyActivationRequest { insurance_certificate_number: string; }