'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, X, Search } from 'lucide-react';
import Link from 'next/link';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function CustomersReportPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [kycStatus, setKycStatus] = useState('all');
    const [search, setSearch] = useState('');

    const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

    const { data: rawData, isLoading } = useQuery({
        queryKey: ['customers-report', dateFrom, dateTo, kycStatus],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            if (kycStatus !== 'all') params.kyc_status = kycStatus;
            const response = await api.get('/reports/customers-detail/', { params });
            return response.data as Record<string, unknown>[];
        },
    });

    const reportData = search
        ? rawData?.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
        : rawData;

    const activeFilters = [
        kycStatus !== 'all' && { label: `KYC: ${kycStatus}`, clear: () => setKycStatus('all') },
        search && { label: `Search: "${search}"`, clear: () => setSearch('') },
        dateRange && { label: `Joined: ${dateFrom} → ${dateTo ?? '…'}`, clear: () => setDateRange(undefined) },
    ].filter(Boolean) as { label: string; clear: () => void }[];

    const handleReset = () => { setKycStatus('all'); setSearch(''); setDateRange(undefined); };

    const handleDownload = () => {
        if (!reportData || reportData.length === 0) { toast.error('No data to export'); return; }
        const headers = Object.keys(reportData[0]);
        const csvContent = [headers.join(','), ...reportData.map(row => headers.map(h => { const val = row[h]; return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? ''); }).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `customers_report_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click(); URL.revokeObjectURL(url);
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
                if (key.includes('date')) { try { return format(new Date(val as string), 'MMM dd, yyyy'); } catch { return String(val); } }
                return String(val);
            }
        }))
        : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/reports"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
                    <PageHeader title="Customers Detail Report" description={`${reportData?.length ?? 0} results`} />
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={!reportData || reportData.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2">
                            <Label>KYC Status</Label>
                            <Select value={kycStatus} onValueChange={setKycStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="VERIFIED">Verified</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Date Joined</Label>
                            <DateRangePicker date={dateRange} setDate={setDateRange} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
                            </div>
                        </div>
                    </div>
                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {activeFilters.map((f, i) => (
                                <Badge key={i} variant="secondary" className="cursor-pointer" onClick={f.clear}>
                                    {f.label} <X className="ml-1 h-3 w-3" />
                                </Badge>
                            ))}
                            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground text-xs">
                                <X className="mr-1 h-3 w-3" /> Reset All
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isLoading && <div className="text-center py-8 text-muted-foreground">Loading report...</div>}

            {!isLoading && reportData && reportData.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-4 text-sm text-muted-foreground">Showing {reportData.length} customers</div>
                        <DataTable columns={columns} data={reportData} isLoading={isLoading} />
                    </CardContent>
                </Card>
            )}

            {!isLoading && reportData && reportData.length === 0 && (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">No customers found for the selected filters.</CardContent></Card>
            )}
        </div>
    );
}
