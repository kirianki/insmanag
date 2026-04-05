'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '@/services/utilityService';
import { SystemLog } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';
import { JsonDetailsViewer } from '@/components/shared/JsonDetailsViewer';

const columns: ColumnDef<SystemLog>[] = [
  {
    header: "Timestamp",
    accessorKey: "created_at",
    cell: ({ row }: { row: { original: SystemLog } }) => new Date(row.original.created_at).toLocaleString()
  },
  { header: "User", accessorKey: "user_email" },
  { header: "Action", accessorKey: "action_type" },
  { header: "Branch", accessorKey: "branch_name" },
  {
    header: "Details",
    cell: ({ row }: { row: { original: SystemLog } }) => <JsonDetailsViewer data={row.original.details} />
  },
  { header: "IP Address", accessorKey: "ip_address" },
];

export function AuditLogsTab() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [userSearch, setUserSearch] = useState('');
  const [debouncedUserSearch] = useDebounce(userSearch, 500);
  const [actionType, setActionType] = useState<string>('');

  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: (pagination.pageIndex + 1).toString(),
      page_size: pagination.pageSize.toString(),
    };

    if (dateRange?.from) params.created_at_after = format(dateRange.from, 'yyyy-MM-dd');
    if (dateRange?.to) params.created_at_before = format(dateRange.to, 'yyyy-MM-dd');
    if (debouncedUserSearch) params.user_email = debouncedUserSearch;
    if (actionType && actionType !== 'ALL') params.action_type = actionType;

    return params;
  }, [dateRange, debouncedUserSearch, actionType, pagination]);

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', queryParams],
    queryFn: async () => {
      const res = await getAuditLogs(queryParams);
      return res.data;
    },
    // Keep previous data while fetching to avoid flickering
    placeholderData: (previousData) => previousData,
  });

  // Calculate page count from API response
  const pageCount = data?.count ? Math.ceil(data.count / pagination.pageSize) : -1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>Review a trail of all significant actions taken within the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Filter by user email..."
              value={userSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex-1 space-y-2">
            {/* Simple select for action type - can be enhanced with a proper Select component */}
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="VIEW">View</option>
            </select>
          </div>
          <div className="flex-1">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.results || []}
          isLoading={isLoading}
          pagination={pagination}
          setPagination={setPagination}
          pageCount={pageCount}
        />
      </CardContent>
    </Card>
  );
}