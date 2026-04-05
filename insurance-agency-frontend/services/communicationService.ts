// services/communicationService.ts

import { api } from '@/lib/api';

export interface ReminderLog {
    id: string;
    reminder_type: string;
    reminder_type_display: string;
    recipient_type: 'CUSTOMER' | 'AGENT';
    recipient_name: string;
    policy: string | null;
    policy_number: string | null;
    channel: 'SMS' | 'EMAIL' | 'BOTH';
    sms_content: string;
    email_subject: string;
    email_content: string;
    status: 'QUEUED' | 'SENT' | 'FAILED' | 'DELIVERED';
    status_display: string;
    delivery_status: any;
    sent_at: string | null;
    error_message: string;
    created_at: string;
}

export interface ReminderTemplate {
    id: string;
    reminder_type: string;
    reminder_type_display: string;
    name: string;
    sms_template: string;
    email_subject_template: string;
    email_body_template: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FilterParams {
    page?: number;
    page_size?: number;
    reminder_type?: string;
    recipient_type?: string;
    status?: string;
    channel?: string;
    search?: string;
    ordering?: string;
}

/**
 * Fetches a paginated list of reminder logs.
 */
export const getReminderLogs = (params: FilterParams = {}) =>
    api.get<{ results: ReminderLog[]; count: number }>('/reminders/logs/', { params });

/**
 * Fetches all reminder templates.
 */
export const getReminderTemplates = (params: any = {}) =>
    api.get<{ results: ReminderTemplate[]; count: number }>('/reminders/templates/', { params });

/**
 * Updates a reminder template.
 */
export const updateReminderTemplate = (id: string, data: Partial<ReminderTemplate>) =>
    api.patch(`/reminders/templates/${id}/`, data);
