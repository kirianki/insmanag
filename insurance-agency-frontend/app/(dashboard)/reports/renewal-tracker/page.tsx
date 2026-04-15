'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Filter, User } from 'lucide-react';
import Link from 'next/link';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { getCreatePolicyDropdownData } from '@/services/policyService';
import { SearchableCombobox } from '@/components/shared/SearchableCombobox';

export default function RenewalTrackerReportPage() {
    const { user } = useAuth();
    const agencyId = (user as any)?.agency_detail?.id || (user as any)?.agency;

    // Default range: today to 30 days from now
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: undefined
    });

    const [customerId, setCustomerId] = useState<string>('');

    const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

    // Fetch customers for the filter
    const { data: dropdownData } = useQuery({
        queryKey: ['create-policy-dropdown', agencyId],
        queryFn: () => getCreatePolicyDropdownData(agencyId!),
        enabled: !!agencyId,
    });

    const customerOptions = dropdownData?.customers.map(c => ({
        value: c.id,
        label: `${c.first_name} ${c.last_name} (${c.customer_number})`
    })) || [];

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['renewal-tracker-report', dateFrom, dateTo, customerId],
        queryFn: async () => {
            const params: Record<string, string> = {
                format: 'json'
            };
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            if (customerId) params.customer_id = customerId;

            const response = await api.get('/reports/renewal-tracker-detail/', { params });
            return response.data as Record<string, unknown>[];
        },
    });

    const handleDownload = () => {
        if (!reportData || reportData.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = Object.keys(reportData[0]);
        const csvContent = [
            headers.join(','),
            ...reportData.map(row =>
                headers.map(h => {
                    const val = row[h];
                    return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `renewal_tracker_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded');
    };

    const columns: ColumnDef<Record<string, unknown>>[] = reportData && reportData.length > 0
        ? Object.keys(reportData[0]).map(key => ({
            accessorKey: key,
            header: key.replace(/_/g, ' ').toUpperCase(),
            cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
                const val = row.getValue(key);
                if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                if (val === null || val === undefined) return '-';
                if (key.includes('date')) {
                    try {
                        return format(new Date(val as string), 'MMM dd, yyyy');
                    } catch {
                        return String(val);
                    }
                }
                return String(val);
            }
        }))
        : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/reports">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <PageHeader
                        title="Renewal Tracker Report"
                        description="Manual renewal reminders and prospects"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={!reportData || reportData.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-end gap-6">
                        <div className="grid gap-2 flex-1 max-w-sm">
                            <Label>Renewal Period</Label>
                            <DateRangePicker date={dateRange} setDate={setDateRange} />
                        </div>

                        <div className="grid gap-2 flex-1 max-w-sm">
                            <Label className="flex items-center gap-2">
                                <User className="h-4 w-4" /> Filter by Customer
                            </Label>
                            <SearchableCombobox
                                options={customerOptions}
                                value={customerId}
                                onSelect={setCustomerId}
                                placeholder="All Customers"
                                searchPlaceholder="Search customers..."
                                emptyText="No customer found"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="h-9"
                                onClick={() => {
                                    setDateRange({ from: new Date(), to: addDays(new Date(), 30) });
                                    setCustomerId('');
                                }}
                            >
                                Reset
                            </Button>
                            <Button variant="secondary" className="h-9">
                                <Filter className="mr-2 h-4 w-4" />
                                More Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <div className="text-center py-8">Loading renewal tracker data...</div>}

            {!isLoading && reportData && reportData.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-4 text-sm font-medium text-indigo-700 bg-indigo-50 p-2 rounded-md inline-block">
                            Found {reportData.length} renewal reminders
                        </div>
                        <DataTable
                            columns={columns}
                            data={reportData}
                            isLoading={isLoading}
                        />
                    </CardContent>
                </Card>
            )}

            {!isLoading && reportData && reportData.length === 0 && (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        No renewal reminders found in the selected range.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
