'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { SortingState, PaginationState } from '@tanstack/react-table';
import { financeService } from '@/services/financeService';
import { columns } from './components/columns';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Search, X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DateRange } from "react-day-picker";

export default function RevenueBreakdownPage() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || '';

    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [paymentType, setPaymentType] = useState('all');
    const [revenueStatus, setRevenueStatus] = useState('all');

    const queryParams = useMemo(() => ({
        page: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        search: debouncedSearchTerm || undefined,
        ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        payment_type: paymentType !== 'all' ? paymentType : undefined,
        status: revenueStatus !== 'all' ? revenueStatus : undefined,
    }), [pagination, debouncedSearchTerm, sorting, dateRange, paymentType, revenueStatus]);

    const { data: revenueData, isLoading } = useQuery({
        queryKey: ['agency-revenue-detailed', queryParams],
        queryFn: () => financeService.getAgencyRevenue(queryParams),
    });

    const revenueItems = revenueData?.results || [];
    const pageCount = revenueData?.count ? Math.ceil(revenueData.count / pagination.pageSize) : 0;

    const activeFilters = [
        paymentType !== 'all' && { label: `Type: ${paymentType}`, clear: () => setPaymentType('all') },
        revenueStatus !== 'all' && { label: `Status: ${revenueStatus}`, clear: () => setRevenueStatus('all') },
        dateRange && { label: `Date: ${dateRange.from ? format(dateRange.from, 'MMM d') : ''} → ${dateRange.to ? format(dateRange.to, 'MMM d') : '…'}`, clear: () => setDateRange(undefined) },
        debouncedSearchTerm && { label: `Search: "${debouncedSearchTerm}"`, clear: () => setSearchTerm('') },
    ].filter(Boolean) as { label: string; clear: () => void }[];

    const handleReset = () => { setSearchTerm(''); setPaymentType('all'); setRevenueStatus('all'); setDateRange(undefined); };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/reports">
                        <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <PageHeader
                        title="Full Revenue Breakdown"
                        description={`${revenueData?.count ?? 0} transactions`}
                    />
                </div>
                <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Export Report
                </Button>
            </div>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="grid gap-2">
                            <Label>Payment Type</Label>
                            <Select value={paymentType} onValueChange={setPaymentType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="PREMIUM">Premium</SelectItem>
                                    <SelectItem value="COMMISSION">Commission</SelectItem>
                                    <SelectItem value="LEVY">Levy</SelectItem>
                                    <SelectItem value="ENDORSEMENT">Endorsement</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={revenueStatus} onValueChange={setRevenueStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="PARTIAL">Partial</SelectItem>
                                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Date Range</Label>
                            <DateRangePicker date={dateRange} setDate={setDateRange} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Policy, customer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
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

                    <DataTable
                        columns={columns}
                        data={revenueItems}
                        isLoading={isLoading}
                        pageCount={pageCount}
                        pagination={pagination}
                        setPagination={setPagination}
                        sorting={sorting}
                        setSorting={setSorting}
                    />
                </CardContent>
            </Card>

            {revenueItems.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-emerald-50 border-emerald-100">
                        <CardContent className="pt-4">
                            <div className="text-sm font-medium text-emerald-800">Total Revenue in View</div>
                            <div className="text-2xl font-bold text-emerald-900 mt-1">
                                KES {revenueItems.reduce((acc: number, curr: any) => acc + parseFloat(curr.amount || 0), 0).toLocaleString()}
                            </div>
                            <p className="text-xs text-emerald-600 mt-1">Based on current page</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
