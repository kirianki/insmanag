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
import { useAuth } from '@/lib/auth';
import { getToolbarDropdownData } from '@/services/policyService';

export default function PoliciesReportPage() {
    const { user } = useAuth();
    const agencyId = (user as any)?.agency_detail?.id || (user as any)?.agency;

    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [status, setStatus] = useState('all');
    const [providerId, setProviderId] = useState('all');
    const [policyTypeId, setPolicyTypeId] = useState('all');
    const [search, setSearch] = useState('');

    const dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

    const { data: dropdownData } = useQuery({
        queryKey: ['toolbar-dropdown', agencyId],
        queryFn: () => getToolbarDropdownData(agencyId!),
        enabled: !!agencyId,
    });

    const { data: rawData, isLoading } = useQuery({
        queryKey: ['policies-report', dateFrom, dateTo, status, providerId, policyTypeId],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            if (status !== 'all') params.status = status;
            const response = await api.get('/reports/policies-detail/', { params });
            return response.data as Record<string, unknown>[];
        },
    });

    // Client-side filtering for provider, type, search
    const reportData = rawData?.filter(row => {
        const providerMatch = providerId === 'all' || String(row['provider__name'] ?? '').toLowerCase() === dropdownData?.providers.find(p => p.id === providerId)?.name?.toLowerCase();
        const typeMatch = policyTypeId === 'all' || String(row['policy_type__name'] ?? '').toLowerCase() === dropdownData?.policyTypes.find(t => t.id === policyTypeId)?.name?.toLowerCase();
        const searchMatch = !search || Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()));
        return providerMatch && typeMatch && searchMatch;
    });

    const activeFilters = [
        status !== 'all' && { label: `Status: ${status}`, clear: () => setStatus('all') },
        providerId !== 'all' && { label: `Provider: ${dropdownData?.providers.find(p => p.id === providerId)?.name}`, clear: () => setProviderId('all') },
        policyTypeId !== 'all' && { label: `Type: ${dropdownData?.policyTypes.find(t => t.id === policyTypeId)?.name}`, clear: () => setPolicyTypeId('all') },
        search && { label: `Search: "${search}"`, clear: () => setSearch('') },
        dateRange && { label: `Date: ${dateFrom} → ${dateTo ?? '…'}`, clear: () => setDateRange(undefined) },
    ].filter(Boolean) as { label: string; clear: () => void }[];

    const handleReset = () => { setStatus('all'); setProviderId('all'); setPolicyTypeId('all'); setSearch(''); setDateRange(undefined); };

    const handleDownload = () => {
        if (!reportData || reportData.length === 0) { toast.error('No data to export'); return; }
        const headers = Object.keys(reportData[0]);
        const csvContent = [headers.join(','), ...reportData.map(row => headers.map(h => { const val = row[h]; return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? ''); }).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `policies_report_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click(); URL.revokeObjectURL(url);
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
                if (key.includes('amount') || key.includes('premium')) { const n = Number(val); return isNaN(n) ? String(val) : `KES ${n.toLocaleString()}`; }
                return String(val);
            }
        }))
        : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/reports"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
                    <PageHeader title="Policies Detail Report" description={`${reportData?.length ?? 0} results`} />
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={!reportData || reportData.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="EXPIRED">Expired</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    <SelectItem value="LAPSED">Lapsed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Provider</Label>
                            <Select value={providerId} onValueChange={setProviderId}>
                                <SelectTrigger><SelectValue placeholder="All Providers" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Providers</SelectItem>
                                    {dropdownData?.providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Policy Type</Label>
                            <Select value={policyTypeId} onValueChange={setPolicyTypeId}>
                                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {dropdownData?.policyTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Date Range (Policy End)</Label>
                            <DateRangePicker date={dateRange} setDate={setDateRange} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search policy number, customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
                        </div>
                        {activeFilters.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
                                <X className="mr-1 h-3 w-3" /> Reset Filters
                            </Button>
                        )}
                    </div>
                    {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {activeFilters.map((f, i) => (
                                <Badge key={i} variant="secondary" className="cursor-pointer" onClick={f.clear}>
                                    {f.label} <X className="ml-1 h-3 w-3" />
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isLoading && <div className="text-center py-8 text-muted-foreground">Loading report...</div>}

            {!isLoading && reportData && reportData.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-4 text-sm text-muted-foreground">Showing {reportData.length} policies</div>
                        <DataTable columns={columns} data={reportData} isLoading={isLoading} />
                    </CardContent>
                </Card>
            )}

            {!isLoading && reportData && reportData.length === 0 && (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">No policies found for the selected filters.</CardContent></Card>
            )}
        </div>
    );
}
