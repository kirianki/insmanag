import { api } from '@/lib/api';
import { PaginatedResponse, StaffDeduction, PayrollRun, StaffPayment, DeductionType, ContractDeduction, Expense, ExpenseCategory } from '@/types/finance';

export const financeService = {
    // Expenses
    getExpenses: async (params?: any) => {
        const response = await api.get('/finances/expenses/', { params });
        return response.data;
    },
    createExpense: async (data: any) => {
        const response = await api.post('/finances/expenses/', data);
        return response.data;
    },
    updateExpense: async (id: string, data: any) => {
        const response = await api.patch(`/finances/expenses/${id}/`, data);
        return response.data;
    },
    deleteExpense: async (id: string) => {
        await api.delete(`/finances/expenses/${id}/`);
    },
    getExpenseCategories: async () => {
        const response = await api.get('/finances/expense-categories/');
        return response.data;
    },
    createExpenseCategory: async (data: any) => {
        const response = await api.post('/finances/expense-categories/', data);
        return response.data;
    },
    updateExpenseCategory: async (id: string, data: any) => {
        const response = await api.patch(`/finances/expense-categories/${id}/`, data);
        return response.data;
    },
    deleteExpenseCategory: async (id: string) => {
        await api.delete(`/finances/expense-categories/${id}/`);
    },

    // Deductions
    getDeductionTypes: async () => {
        const response = await api.get('/finances/deduction-types/');
        return response.data;
    },
    createDeductionType: async (data: any) => {
        const response = await api.post('/finances/deduction-types/', data);
        return response.data;
    },
    getContractDeductions: async (params?: { contract?: string }) => {
        const response = await api.get('/finances/contract-deductions/', { params });
        return response.data;
    },
    createContractDeduction: async (data: any) => {
        const response = await api.post('/finances/contract-deductions/', data);
        return response.data;
    },
    deleteContractDeduction: (id: string) => api.delete(`/finances/contract-deductions/${id}/`),

    // Staff Deductions (History)
    getStaffDeductions: async (params: Record<string, any>) => {
        const response = await api.get<PaginatedResponse<StaffDeduction>>('/finances/staff-deductions/', { params });
        return response.data;
    },
    getAnnualDeductionsSummary: async (year?: number, userId?: string) => {
        const response = await api.get('/finances/staff-deductions/annual_summary/', {
            params: { year, user: userId }
        });
        return response.data;
    },

    // Contracts
    getStaffContracts: async (params?: { user?: string }) => {
        const response = await api.get('/finances/staff-contracts/', { params });
        return response.data;
    },
    createStaffContract: async (data: any) => {
        const response = await api.post('/finances/staff-contracts/', data);
        return response.data;
    },

    // Payroll
    getPayrollRuns: async (params?: any): Promise<PaginatedResponse<PayrollRun>> => {
        const response = await api.get<PaginatedResponse<PayrollRun>>('/finances/payroll-runs/', { params });
        return response.data;
    },
    generatePayroll: async (month: string) => {
        const response = await api.post('/finances/payroll-runs/generate/', { month });
        return response.data;
    },
    approvePayroll: async (id: string | number) => {
        const response = await api.post(`/finances/payroll-runs/${id}/approve/`, {});
        return response.data;
    },

    // Staff Payments
    getStaffPayments: async (params?: { user?: string }) => {
        const response = await api.get<PaginatedResponse<StaffPayment>>('/finances/staff-payments/', { params });
        return response.data;
    },
    getStaffAnalytics: async (userId: string) => {
        const response = await api.get('/finances/staff-payments/staff_analytics/', {
            params: { user: userId }
        });
        return response.data;
    },

    // Revenue
    getAgencyRevenue: async (params?: any) => {
        const response = await api.get('/finances/agency-revenue/', { params });
        return response.data;
    },

    // Users
    getUsers: async () => {
        const response = await api.get('/accounts/users/');
        return response.data;
    },
};
