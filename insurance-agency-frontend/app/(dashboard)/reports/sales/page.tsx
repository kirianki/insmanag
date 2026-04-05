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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const reportTypes = [
    { value: 'overall-sales-summary', label: 'Overall Summary' },
    { value: 'sales-summary', label: 'By Agent' },
    { value: 'sales-summary-by-type', label: 'By Policy Type' },
    { value: 'sales-summary-by-provider', label: 'By Provider' },
];

export default function SalesReportPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [reportType, setReportType] = useState('overall-sales-summary');
    const [interval, setInterval] = useState('none');

    const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['sales-report', reportType, dateFrom, dateTo, interval],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            if (interval !== 'none') params.interval = interval;

            const response = await api.get(`/reports/${reportType}/`, { params });
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
        link.download = `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/reports">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <PageHeader title="Sales Summary Report" />
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="grid gap-2">
                            <Label>Report Type</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {reportTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Interval</Label>
                            <Select value={interval} onValueChange={setInterval}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Total (No Grouping)</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label>Date Range</Label>
                            <div className="flex items-center gap-2">
                                <DateRangePicker date={dateRange} setDate={setDateRange} />
                                <Button variant="outline" size="sm" onClick={handleDownload} disabled={!reportData || reportData.length === 0}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export CSV
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <div className="text-center py-8">Loading report...</div>}

            {reportData && reportData.length > 0 && (
                <div className="space-y-6">
                    <ReportVisuals data={reportData} reportType={reportType} />

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
                        No sales data found for the selected filters.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
