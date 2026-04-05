'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { ReportVisuals } from '../components/ReportVisuals';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

export default function CommissionsReportPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['commissions-report', dateFrom, dateTo],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const response = await api.get('/reports/commissions-summary/', { params });
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
        link.download = `commissions_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
                return String(val);
            }
        }))
        : [];

    console.log('Commissions Report Debug:', { dateFrom, dateTo, isLoading, reportDataCount: reportData?.length, reportDataIsArray: Array.isArray(reportData) });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/reports">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <PageHeader title="Commissions Report" />
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium">Date Range</label>
                            <DateRangePicker date={dateRange} setDate={setDateRange} />
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDownload} disabled={!reportData || (Array.isArray(reportData) && reportData.length === 0)}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <div className="text-center py-8">Loading report...</div>}

            {reportData && reportData.length > 0 && (
                <div className="space-y-6">
                    <ReportVisuals data={reportData} reportType="commissions-summary" />

                    <Card>
                        <CardContent className="pt-6">
                            <DataTable
                                columns={columns}
                                data={reportData}
                                isLoading={isLoading}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {reportData && reportData.length === 0 && (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        No commission data found for the selected date range.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
