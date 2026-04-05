'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getBranches, getUsers } from '@/services/accountsService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Download } from 'lucide-react';
import { getUserRoles } from '@/lib/utils';

// --- UPDATED: Reports are now grouped for a better user experience ---
const reportGroups = [
  {
    label: 'Overall Summary Reports',
    items: [
      { value: 'pnl', label: 'Profit & Loss (P&L)' },
      { value: 'overall-sales-summary', label: 'Overall Sales Summary' },
      { value: 'claims-summary-overall', label: 'Overall Claims Summary' },
      { value: 'sales-summary-by-type', label: 'Sales Summary by Policy Type' },
      { value: 'sales-summary-by-provider', label: 'Sales Summary by Provider' },
    ],
  },
  {
    label: 'Agent-Level Summary Reports',
    items: [
      { value: 'sales-summary', label: 'Sales Summary by Agent' },
      { value: 'commissions-summary', label: 'Commissions Summary by Agent' },
      { value: 'leads-summary', label: 'Leads Summary by Agent' },
    ],
  },
  {
    label: 'Detail Reports',
    items: [
      { value: 'policies-detail', label: 'Policies Detail Report' },
      { value: 'customers-detail', label: 'Customers Detail Report' },
      { value: 'claims-detail', label: 'Claims Detail Report' },
    ]
  }
];

// Helper array to identify which reports are "detail" reports
const detailReportTypes = ['policies-detail', 'customers-detail', 'claims-detail'];

// Options for the contextual filters, mirroring backend choices
const policyStatusOptions = ['AWAITING_PAYMENT', 'PAID_PENDING_ACTIVATION', 'ACTIVE', 'ACTIVE_INSTALLMENT', 'LAPSED', 'EXPIRED', 'CANCELLED'];
const claimStatusOptions = ['FNOL', 'UNDER_REVIEW', 'AWAITING_DOCS', 'APPROVED', 'SETTLED', 'REJECTED', 'CLOSED'];
const kycStatusOptions = ['PENDING', 'VERIFIED', 'REJECTED'];

interface ReportParams {
  reportType: string;
  date_from?: string;
  date_to?: string;
  interval?: string;
  agent_id?: string;
  status?: string;
  kyc_status?: string;
}

interface ReportFormProps {
  onGenerate: (params: ReportParams) => void;
  isGenerating: boolean;
}

export function ReportForm({ onGenerate, isGenerating }: ReportFormProps) {
  const { user } = useAuth();
  const agencyId = user?.agency_detail.id;
  const userRoles = getUserRoles(user);

  // State for all filters
  const [reportType, setReportType] = useState('overall-sales-summary');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [agentId, setAgentId] = useState('all');
  const [branchId, setBranchId] = useState('all');

  const [status, setStatus] = useState('all');
  const [kycStatus, setKycStatus] = useState('all');
  const [interval, setIntervalValue] = useState('none');

  // Query for branches (only for Agency Admins to filter the agent list)
  const { data: branches } = useQuery({
    queryKey: ['allBranches', agencyId],
    queryFn: () => getBranches(agencyId as string).then(res => res.data.results),
    enabled: !!agencyId && userRoles.includes('Agency Admin'),
  });

  const { data: agents } = useQuery({
    queryKey: ['allUsers', agencyId, branchId], // Refetches when branchId changes
    queryFn: () => {
      const params: { paginated: boolean; branch?: string } = {
        paginated: false
      };
      if (branchId !== 'all') {
        params.branch = branchId;
      }
      return getUsers(params).then(res => res.data.results);
    },
    enabled: !!agencyId && (userRoles.includes('Branch Manager') || userRoles.includes('Agency Admin')),
  });

  const handleGenerateClick = () => {
    const params: Record<string, string> = {};

    if (dateRange?.from) {
      params.date_from = dateRange.from.toISOString().split('T')[0];
    }
    if (dateRange?.to) {
      params.date_to = dateRange.to.toISOString().split('T')[0];
    }

    // --- UPDATED: Only add agent_id if the report type is a detail report ---
    if (detailReportTypes.includes(reportType) && agentId !== 'all') {
      params.agent_id = agentId;
    }

    if ((reportType === 'policies-detail' || reportType === 'claims-detail') && status !== 'all') {
      params.status = status;
    }
    if (reportType === 'customers-detail' && kycStatus !== 'all') {
      params.kyc_status = kycStatus;
    }

    if (!detailReportTypes.includes(reportType) && interval !== 'none') {
      params.interval = interval;
    }

    onGenerate({
      reportType,
      ...params,
    });
  };

  const getStatusOptions = () => {
    if (reportType === 'policies-detail') return policyStatusOptions;
    if (reportType === 'claims-detail') return claimStatusOptions;
    return [];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate a Report</CardTitle>
        <CardDescription>Select report type and filters, then generate the data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* --- Main Filters --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="grid gap-2">
            <Label htmlFor="report-type">Report Type</Label>
            {/* --- UPDATED: Select now uses groups for better organization --- */}
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {reportGroups.map(group => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.items.map(rt => (
                      <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Date Range</Label>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
          </div>
          {!detailReportTypes.includes(reportType) && reportType !== 'pnl' && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <Label htmlFor="interval">Interval (Grouping)</Label>
              <Select value={interval} onValueChange={setIntervalValue}>
                <SelectTrigger id="interval"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Total (No Grouping)</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* --- UPDATED: Contextual Filters now only appear for Detail Reports --- */}
        {detailReportTypes.includes(reportType) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border-t pt-6">
            {/* Status filter for Policies and Claims */}
            {(reportType === 'policies-detail' || reportType === 'claims-detail') && (
              <div className="grid gap-2">
                <Label>Filter by Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {getStatusOptions().map(s => <SelectItem key={s} value={s.replace(/_/g, ' ')}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* KYC Status filter for Customers */}
            {reportType === 'customers-detail' && (
              <div className="grid gap-2">
                <Label>Filter by KYC Status</Label>
                <Select value={kycStatus} onValueChange={setKycStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All KYC Statuses</SelectItem>
                    {kycStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* --- UPDATED: Agent/Branch filters now only appear for Detail Reports --- */}
        {(userRoles.includes('Branch Manager') || userRoles.includes('Agency Admin')) && detailReportTypes.includes(reportType) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border-t pt-6">
            {userRoles.includes('Agency Admin') && (
              <div className="grid gap-2">
                <Label>Filter Agents by Branch</Label>
                <Select value={branchId} onValueChange={setBranchId} disabled={!branches}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Branches</SelectItem>{branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Filter by Agent</Label>
              <Select value={agentId} onValueChange={setAgentId} disabled={!agents}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Agents</SelectItem>{agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Button onClick={handleGenerateClick} disabled={isGenerating}>
          <Download className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Report"}
        </Button>
      </CardContent>
    </Card>
  );
}