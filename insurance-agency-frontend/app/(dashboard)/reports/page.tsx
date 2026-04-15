'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  BarChart3,
  Target
} from 'lucide-react';

const reportCategories = [
  {
    title: 'Financial Reports',
    reports: [
      {
        name: 'Profit & Loss (P&L)',
        description: 'Revenue, expenses, and profit analysis with trends',
        href: '/reports/pnl',
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      {
        name: 'Full Revenue Breakdown',
        description: 'Detailed view of all agency revenue at policy and customer level',
        href: '/reports/revenue',
        icon: FileText,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      },
      {
        name: 'Commissions',
        description: 'Agent commissions by status and period',
        href: '/reports/commissions',
        icon: DollarSign,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      {
        name: 'Sales Summary',
        description: 'Sales performance by agent, type, and provider',
        href: '/reports/sales',
        icon: BarChart3,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
    ],
  },
  {
    title: 'Detail Reports',
    reports: [
      {
        name: 'Policies',
        description: 'Detailed policy records and status',
        href: '/reports/policies',
        icon: FileText,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
      },
      {
        name: 'Renewal Tracker',
        description: 'Manual renewal reminders and prospects',
        href: '/reports/renewal-tracker',
        icon: Target,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
      },
      {
        name: 'Upcoming Renewals',
        description: 'Track policies approaching expiration for timely follow-up',
        href: '/reports/renewals',
        icon: AlertCircle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      },
      {
        name: 'Customers',
        description: 'Customer records and KYC status',
        href: '/reports/customers',
        icon: Users,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
      },
      {
        name: 'Claims',
        description: 'Claims activity and settlements',
        href: '/reports/claims',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      },
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="View detailed analytics and export data for your business operations"
      />

      {reportCategories.map((category) => (
        <div key={category.title} className="space-y-4">
          <h2 className="text-xl font-semibold">{category.title}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {category.reports.map((report) => {
              const Icon = report.icon;
              return (
                <Link key={report.name} href={report.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${report.bgColor}`}>
                          <Icon className={`h-6 w-6 ${report.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{report.name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{report.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}