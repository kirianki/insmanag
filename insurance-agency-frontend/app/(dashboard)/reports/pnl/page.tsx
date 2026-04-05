'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { PnLReport } from '../components/PnLReport';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

type PeriodType = 'weekly' | 'monthly' | 'annually';

export default function PnLReportPage() {
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');

    // Generate period options based on type
    const generatePeriodOptions = React.useCallback(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        if (periodType === 'weekly') {
            // Generate last 12 weeks
            const weeks = [];
            for (let i = 0; i < 12; i++) {
                const weekDate = new Date(now);
                weekDate.setDate(weekDate.getDate() - (i * 7));
                const year = weekDate.getFullYear();
                const week = Math.ceil((weekDate.getDate() + new Date(year, weekDate.getMonth(), 1).getDay()) / 7);
                weeks.push({
                    value: `${year}-W${week.toString().padStart(2, '0')}`,
                    label: `Week ${week}, ${weekDate.toLocaleString('default', { month: 'short' })} ${year}`
                });
            }
            return weeks;
        } else if (periodType === 'monthly') {
            // Generate last 12 months
            const months = [];
            for (let i = 0; i < 12; i++) {
                const monthDate = new Date(currentYear, currentMonth - i, 1);
                const year = monthDate.getFullYear();
                const month = monthDate.getMonth() + 1;
                months.push({
                    value: `${year}-${month.toString().padStart(2, '0')}`,
                    label: `${monthDate.toLocaleString('default', { month: 'long' })} ${year}`
                });
            }
            return months;
        } else {
            // Generate last 5 years
            const years = [];
            for (let i = 0; i < 5; i++) {
                const year = currentYear - i;
                years.push({
                    value: year.toString(),
                    label: year.toString()
                });
            }
            return years;
        }
    }, [periodType]);


    // Calculate date range from selected period
    const getDateRange = () => {
        if (!selectedPeriod) return { dateFrom: undefined, dateTo: undefined };

        if (periodType === 'weekly') {
            const [year, weekStr] = selectedPeriod.split('-W');
            const week = parseInt(weekStr);
            const firstDayOfYear = new Date(parseInt(year), 0, 1);
            const daysOffset = (week - 1) * 7;
            const weekStart = new Date(firstDayOfYear);
            weekStart.setDate(firstDayOfYear.getDate() + daysOffset - firstDayOfYear.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            return {
                dateFrom: format(weekStart, 'yyyy-MM-dd'),
                dateTo: format(weekEnd, 'yyyy-MM-dd')
            };
        } else if (periodType === 'monthly') {
            const [year, month] = selectedPeriod.split('-');
            const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
            const monthEnd = new Date(parseInt(year), parseInt(month), 0);

            return {
                dateFrom: format(monthStart, 'yyyy-MM-dd'),
                dateTo: format(monthEnd, 'yyyy-MM-dd')
            };
        } else {
            const year = selectedPeriod;
            const yearStart = new Date(parseInt(year), 0, 1);
            const yearEnd = new Date(parseInt(year), 11, 31);

            return {
                dateFrom: format(yearStart, 'yyyy-MM-dd'),
                dateTo: format(yearEnd, 'yyyy-MM-dd')
            };
        }
    };

    const { dateFrom, dateTo } = getDateRange();
    const periodOptions = generatePeriodOptions();

    // Set default period on mount or when type changes
    React.useEffect(() => {
        const options = generatePeriodOptions();
        if (options.length > 0) {
            setSelectedPeriod(options[0].value);
        }
    }, [generatePeriodOptions]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/reports">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <PageHeader title="Profit & Loss (P&L) Report" />
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="space-y-2">
                                <Label>Period Type</Label>
                                <Select value={periodType} onValueChange={(value: string) => {
                                    setPeriodType(value as PeriodType);
                                    setSelectedPeriod('');
                                }}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="annually">Annually</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Select Period</Label>
                                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                                    <SelectTrigger className="w-[220px]">
                                        <SelectValue placeholder="Choose a period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {periodOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <PnLReport dateFrom={dateFrom} dateTo={dateTo} />
        </div>
    );
}
