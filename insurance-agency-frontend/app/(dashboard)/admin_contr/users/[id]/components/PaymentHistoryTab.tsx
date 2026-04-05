'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeService } from '@/services/financeService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffPayment, StaffDeduction } from '@/types/finance';
import {
    TrendingUp,
    DollarSign,
    PieChart,
    ShieldAlert,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useState } from 'react';

interface PaymentHistoryTabProps {
    userId: string;
}

export function PaymentHistoryTab({ userId }: PaymentHistoryTabProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const { data: payments, isLoading: paymentsLoading } = useQuery({
        queryKey: ['staff-payments', userId],
        queryFn: () => financeService.getStaffPayments({ user: userId }),
    });

    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ['staff-analytics', userId],
        queryFn: () => financeService.getStaffAnalytics(userId),
    });

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
    };

    if (paymentsLoading || analyticsLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const results = payments?.results || [];

    return (
        <div className="space-y-6">
            {/* Analytics Summary */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Net Paid</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">KES {analytics?.total_net?.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Across {analytics?.count} months</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">KES {analytics?.total_commissions?.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">KES {analytics?.total_deductions?.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Net Monthly</CardTitle>
                        <PieChart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            KES {analytics?.count > 0 ? (analytics.total_net / analytics.count).toLocaleString() : '0'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment List */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Month</TableHead>
                                <TableHead>Base Pay</TableHead>
                                <TableHead>Commissions</TableHead>
                                <TableHead>Deductions</TableHead>
                                <TableHead className="text-right">Net Paid</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No payment history found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((payment: StaffPayment) => (
                                    <React.Fragment key={payment.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleRow(payment.id)}
                                        >
                                            <TableCell>
                                                {expandedRows.has(payment.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {payment.payroll_run_month ? format(new Date(payment.payroll_run_month), 'MMMM yyyy') : 'N/A'}
                                            </TableCell>
                                            <TableCell>KES {Number(payment.base_pay).toLocaleString()}</TableCell>
                                            <TableCell>KES {Number(payment.commission_pay).toLocaleString()}</TableCell>
                                            <TableCell className="text-red-500">- KES {Number(payment.deductions_total).toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                KES {Number(payment.net_pay).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {payment.is_paid ? (
                                                    <Badge className="bg-green-100 text-green-800 border-green-200">PAID</Badge>
                                                ) : (
                                                    <Badge variant="secondary">PENDING</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        {expandedRows.has(payment.id) && (payment.deductions?.length ?? 0) > 0 && (
                                            <TableRow className="bg-muted/30">
                                                <TableCell colSpan={7}>
                                                    <div className="p-2 space-y-2">
                                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deduction Details</h4>
                                                        <div className="grid grid-cols-2 gap-4 max-w-md">
                                                            {payment.deductions?.map((d: StaffDeduction) => (
                                                                <div key={d.id} className="flex justify-between text-sm py-1 border-b">
                                                                    <span>{d.name}</span>
                                                                    <span className="font-medium text-red-500">KES {Number(d.amount).toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
