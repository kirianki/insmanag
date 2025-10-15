'use client';

import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { SystemLog } from '../../../types';
import { useAuth } from '../../../hooks/use-auth';
import { DataTable } from '../../../components/shared/data-table';
import { auditLogColumns } from '../../../components/features/audit-logs/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Terminal } from 'lucide-react';

// API Function to fetch audit logs
const fetchAuditLogs = async (): Promise<{ results: SystemLog[] }> => {
  // The backend automatically scopes this request to the admin's agency
  const { data } = await api.get('/audit-logs/');
  return data;
};

export default function AuditLogsPage() {
  const { user } = useAuth();

  // Client-side role check for immediate feedback
  const hasAccess = user?.roles.includes('Agency Admin') || user?.roles.includes('Superuser');

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
    // Only run the query if the user has the correct role
    enabled: hasAccess,
  });

  if (!hasAccess) {
    return (
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have the necessary permissions to view audit logs.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) return <div>Loading audit logs...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Logs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Agency Activity</CardTitle>
          <CardDescription>
            A record of important events that have occurred within your agency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={auditLogColumns}
            data={data?.results || []}
            filterColumnId="user_email"
            filterPlaceholder="Filter by user email..."
          />
        </CardContent>
      </Card>
    </div>
  );
}