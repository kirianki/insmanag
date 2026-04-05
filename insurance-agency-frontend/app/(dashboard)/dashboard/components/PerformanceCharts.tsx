'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PerformanceBreakdown, AnalyticsDashboardResponse } from '@/types/api';
import { TrendingUp, BarChart3, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const formatCurrency = (value?: string | number) => {
    if (value === undefined || value === null) return 'KES 0';
    return `KES ${Number(value).toLocaleString()}`;
};

interface BreakdownTableProps {
    title: string;
    description: string;
    data: PerformanceBreakdown[];
    nameKey: string;
    idKey: string;
    icon: React.ElementType;
    iconColor: string;
}

function BreakdownTable({ title, description, data, nameKey, idKey, icon: Icon, iconColor }: BreakdownTableProps) {
    const router = useRouter();

    const handleRowClick = (item: PerformanceBreakdown) => {
        const filterId = item[idKey];
        if (!filterId) return;
        const filterKey = idKey.split('__')[0];
        router.push(`/policies?${filterKey}=${filterId}`);
    };

    const headerNameArr = nameKey.split('__')[0].replace('_', ' ').split(' ');
    const headerName = headerNameArr.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <Card className="border-none shadow-sm bg-background/40 hover:bg-background/60 transition-colors overflow-hidden group">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-background border border-border/50 shadow-sm", iconColor)}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                        <CardTitle className="text-sm font-bold uppercase tracking-tight">{title}</CardTitle>
                        <CardDescription className="text-[10px] leading-none">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
                <div className="rounded-xl border border-border/50 bg-background/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-b border-border/50">
                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-muted-foreground">{headerName}</TableHead>
                                <TableHead className="h-9 px-4 text-right text-[10px] font-bold uppercase text-muted-foreground">Volume</TableHead>
                                <TableHead className="h-9 px-4 text-right text-[10px] font-bold uppercase text-muted-foreground">Premium</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length > 0 ? data.map((item, index) => (
                                <TableRow
                                    key={index}
                                    onClick={() => handleRowClick(item)}
                                    className="group/row cursor-pointer border-b border-border/30 last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors"
                                >
                                    <TableCell className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-foreground group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 transition-colors line-clamp-1">
                                                {item[nameKey]}
                                            </span>
                                            <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all text-indigo-500" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-right">
                                        <span className="text-xs font-bold text-foreground/80">{item.policies_count}</span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-right">
                                        <span className="text-xs font-bold text-foreground">{formatCurrency(item.total_premium)}</span>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-20 text-center text-xs text-muted-foreground">No data available</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export function PerformanceCharts({ breakdowns }: { breakdowns: NonNullable<AnalyticsDashboardResponse['performance_breakdowns']> }) {
    return (
        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm lg:col-span-4 overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-500" />
                            Market Performance
                        </CardTitle>
                        <CardDescription className="text-xs">Deep-dive into sales distribution across categories.</CardDescription>
                    </div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground/10 absolute top-4 right-4" />
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4">
                    {breakdowns.by_branch && (
                        <BreakdownTable
                            title="Branch Distribution"
                            description="Performance by geographic office"
                            data={breakdowns.by_branch}
                            nameKey="branch__branch_name"
                            idKey="branch__id"
                            icon={BarChart3}
                            iconColor="text-indigo-500"
                        />
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                        <BreakdownTable
                            title="Policy Segments"
                            description="Top selling insurance types"
                            data={breakdowns.by_policy_type}
                            nameKey="policy_type__name"
                            idKey="policy_type__id"
                            icon={TrendingUp}
                            iconColor="text-emerald-500"
                        />
                        <BreakdownTable
                            title="Carrier Mix"
                            description="Partners contributing to volume"
                            data={breakdowns.by_provider}
                            nameKey="provider__name"
                            idKey="provider__id"
                            icon={BarChart3}
                            iconColor="text-orange-500"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}