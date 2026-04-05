'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ReportVisualsProps {
    data: Record<string, unknown>[];
    reportType: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function ReportVisuals({ data, reportType }: ReportVisualsProps) {
    if (!data || data.length === 0) return null;

    const isTimeSeries = data.length > 0 && 'period' in data[0];

    // 1. Overall Sales Summary
    if (reportType === 'overall-sales-summary') {
        if (isTimeSeries) {
            return (
                <div className="grid gap-6">
                    <Card>
                        <CardHeader><CardTitle>Sales Trend</CardTitle></CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="period"
                                        tickFormatter={(tick: string) => format(parseISO(tick), 'MMM dd')}
                                    />
                                    <YAxis />
                                    <Tooltip labelFormatter={(label: string) => format(parseISO(label), 'PPP')} />
                                    <Legend />
                                    <Area type="monotone" dataKey="total_premium_written" stroke="#8884d8" fill="#8884d8" name="Premium Written" />
                                    <Area type="monotone" dataKey="total_policies_sold" stroke="#82ca9d" fill="#82ca9d" name="Policies Sold" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            );
        } else {
            const stats = data[0];
            return (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Policies Sold</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{String(stats.total_policies_sold)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Premium Written</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">KES {Number(stats.total_premium_written).toLocaleString()}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Premium / Policy</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">KES {Number(stats.average_premium_per_policy).toLocaleString()}</div></CardContent>
                    </Card>
                </div>
            );
        }
    }

    // 2. Sales Summary by Policy Type / Provider
    if (reportType === 'sales-summary-by-type' || reportType === 'sales-summary-by-provider') {
        const nameKey = reportType === 'sales-summary-by-type' ? 'policy_type__name' : 'provider__name';

        // Sort data by total_premium descending
        const sortedData = [...data].sort((a, b) => Number(b.total_premium) - Number(a.total_premium));

        // Take top 5 and aggregate the rest as "Others"
        let displayData = sortedData;
        if (sortedData.length > 5) {
            const top5 = sortedData.slice(0, 5);
            const others = sortedData.slice(5);

            // Aggregate "Others"
            const othersAggregate = others.reduce((acc, item) => ({
                [nameKey]: 'Others',
                total_premium: Number(acc.total_premium || 0) + Number(item.total_premium),
                policy_count: Number(acc.policy_count || 0) + Number(item.policy_count),
            }), { [nameKey]: 'Others', total_premium: 0, policy_count: 0 });

            displayData = [...top5, othersAggregate];
        }

        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Premium Distribution</CardTitle></CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={displayData}
                                    cx="50%"
                                    cy="45%"
                                    labelLine={false}
                                    label={({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="total_premium"
                                    nameKey={nameKey}
                                >
                                    {displayData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px' }}
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Policy Count Breakdown</CardTitle></CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={displayData} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis
                                    dataKey={nameKey}
                                    type="category"
                                    width={150}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="policy_count" fill="#82ca9d" name="Policies Sold" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 3. Claims Summary Overall
    if (reportType === 'claims-summary-overall') {
        if (isTimeSeries) {
            return (
                <Card>
                    <CardHeader><CardTitle>Claims reported Trend</CardTitle></CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" tickFormatter={(tick: string) => format(parseISO(tick), 'MMM dd')} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total_claims_filed" fill="#8884d8" name="Claims Filed" />
                                <Bar dataKey="open_claims" fill="#FFBB28" name="Open Claims" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            );
        } else {
            const stats = data[0];
            return (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Claims</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{String(stats.total_claims_filed)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Estimated Loss</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-red-600">KES {Number(stats.total_estimated_loss).toLocaleString()}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Settled Amount</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-600">KES {Number(stats.total_settled_amount).toLocaleString()}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Open Claims</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-blue-600">{String(stats.open_claims)}</div></CardContent>
                    </Card>
                </div>
            );
        }
    }

    // 4. Sales Summary by Agent
    if (reportType === 'sales-summary') {
        const chartData = data.map(row => ({
            ...row,
            name: `${row.agent__first_name || ''} ${row.agent__last_name || ''}`.trim() || 'Unknown Agent'
        }));

        return (
            <Card>
                <CardHeader><CardTitle>Sales Production by Agent</CardTitle></CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={150}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total_premium" fill="#8884d8" name="Total Premium (KES)" />
                            <Bar dataKey="policies_sold" fill="#82ca9d" name="Policies Sold" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );
    }

    // 5. Leads Summary
    if (reportType === 'leads-summary') {
        const chartData = data.map(row => ({
            ...row,
            name: `${row.assigned_agent__first_name || ''} ${row.assigned_agent__last_name || ''}`.trim() || 'Unknown Agent'
        }));

        return (
            <Card>
                <CardHeader><CardTitle>Lead Performance by Agent</CardTitle></CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={150}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total_leads" fill="#8884d8" name="Total Leads" stackId="a" />
                            <Bar dataKey="converted_leads" fill="#22c55e" name="Converted" stackId="a" />
                            <Bar dataKey="lost_leads" fill="#ef4444" name="Lost" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );
    }

    // 6. Commissions Summary
    if (reportType === 'commissions-summary') {
        const chartData = data.map(row => ({
            ...row,
            name: `${row.agent__first_name || ''} ${row.agent__last_name || ''} (${row.status || 'Unknown'})`.trim()
        }));

        return (
            <Card>
                <CardHeader><CardTitle>Commissions by Agent & Status</CardTitle></CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={200}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total_amount" fill="#8884d8" name="Total Amount (KES)" />
                            <Bar dataKey="commission_count" fill="#82ca9d" name="Count" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        );
    }

    // Default: Just show generic KPI if count is available
    if (data.length > 0) {
        return (
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Records / Rows</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{data.length}</div></CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
