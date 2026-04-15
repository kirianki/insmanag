export interface ExpenseCategory {
    id: string;
    name: string;
    description: string;
}

export interface Expense {
    id: string;
    category: string;
    category_name: string;
    amount: string | number;
    date_incurred: string;
    description: string;
    frequency: string;
    is_recurring: boolean;
    next_due_date?: string;
}

export interface StaffContract {
    id: string;
    user: string;
    user_email: string;
    base_salary: string | number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    tax_pin?: string;
}

export interface StaffPayment {
    id: string;
    user: string;
    user_name: string;
    user_email: string;
    base_pay: string | number;
    commission_pay: string | number;
    deductions_total: string | number;
    net_pay: string | number;
    is_paid: boolean;
    payroll_run_month?: string;
    deductions?: StaffDeduction[];
}

export interface PayrollRun {
    id: string;
    month: string;
    status: 'DRAFT' | 'APPROVED' | 'PAID';
    processed_by_name: string;
    total_payout: string | number;
    payments?: StaffPayment[];
}

export interface AgencyRevenue {
    id: string;
    amount: string | number;
    date_recognized: string;
    description: string;
    source_policy_number: string;
    provider_name?: string;
    policy_type_name?: string;
    customer_name?: string;
    vehicle_registration_number?: string;
}

export interface DeductionType {
    id: string;
    name: string;
    description: string;
}

export interface ContractDeduction {
    id: string;
    contract: string;
    deduction_type: string;
    deduction_type_name?: string;
    amount_type: 'FIXED' | 'PERCENTAGE_OF_BASE';
    amount: string | number;
    is_active: boolean;
}

export interface StaffDeduction {
    id: string;
    staff_payment: string;
    staff_name?: string;
    name: string;
    deduction_type: string;
    deduction_type_name?: string;
    amount: string | number;
    created_at: string;
}

export interface AnnualDeductionSummary {
    name: string;
    total: string | number;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface UserBasic {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
}
