'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AuditLogsTab } from '../components/AuditLogsTab';

export default function AuditLogsPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Audit Logs" />
            <AuditLogsTab />
        </div>
    );
}
