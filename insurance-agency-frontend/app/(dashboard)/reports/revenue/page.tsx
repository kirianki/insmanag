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
import { ArrowLeft, Download, Filter } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';

import { DateRange } from "react-day-picker";

export default function RevenueBreakdownPage() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || '';

    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    });

    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const queryParams = useMemo(() => ({
        page: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        search: debouncedSearchTerm || undefined,
        ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
        date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    }), [pagination, debouncedSearchTerm, sorting, dateRange]);

    const { data: revenueData, isLoading } = useQuery({
        queryKey: ['agency-revenue-detailed', queryParams],
        queryFn: () => financeService.getAgencyRevenue(queryParams),
    });

    const revenueItems = revenueData?.results || [];
    const pageCount = revenueData?.count ? Math.ceil(revenueData.count / pagination.pageSize) : 0;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/reports">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <PageHeader
                        title="Full Revenue Breakdown"
                        description="Detailed transaction history of all agency income"
                    />
                </div>
                <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                </Button>
            </div>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-1 items-center gap-2 w-full md:max-w-sm">
                            <Input
                                placeholder="Search policies, customers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <DateRangePicker
                                date={dateRange}
                                setDate={setDateRange}
                            />
                            <Button variant="outline" size="sm" className="h-9">
                                <Filter className="mr-2 h-4 w-4" />
                                Advanced Filters
                            </Button>
                        </div>
                    </div>

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

            {revenueData && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-emerald-50 border-emerald-100">
                        <CardContent className="pt-4">
                            <div className="text-sm font-medium text-emerald-800">Total Revenue in View</div>
                            <div className="text-2xl font-bold text-emerald-900 mt-1">
                                KES {revenueItems.reduce((acc: number, curr: any) => acc + parseFloat(curr.amount), 0).toLocaleString()}
                            </div>
                            <p className="text-xs text-emerald-600 mt-1">Based on filtered results</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
