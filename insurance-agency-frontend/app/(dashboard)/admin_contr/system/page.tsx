'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditLogsTab } from './components/AuditLogsTab';
import { KycManagementTab } from './components/KycManagementTab';

export default function SystemPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="System & Administration" />

            <Tabs defaultValue="audit-logs" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
                    <TabsTrigger value="kyc-management">KYC Management</TabsTrigger>
                </TabsList>
                <TabsContent value="audit-logs" className="mt-4">
                    <AuditLogsTab />
                </TabsContent>

                <TabsContent value="kyc-management" className="mt-4">
                    <KycManagementTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}