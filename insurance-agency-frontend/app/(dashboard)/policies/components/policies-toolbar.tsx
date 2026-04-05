'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, Building, Filter, CreditCard, Car, PlusCircle, FileText } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { useQuery } from '@tanstack/react-query';
import { getToolbarDropdownData } from '@/services/policyService';
import { useAuth } from '@/lib/auth';


interface PoliciesToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  providerFilter: string;
  setProviderFilter: (value: string) => void;
  policyTypeFilter: string;
  setPolicyTypeFilter: (value: string) => void;
  installmentFilter: string;
  setInstallmentFilter: (value: string) => void;
  hasVehicleReg: boolean;
  setHasVehicleReg: (value: boolean) => void;
  dateRange: DateRange | undefined;
  setDateRange: (date: DateRange | undefined) => void;
  onCreateClick: () => void;
}

const statusOptions = [{ value: 'all', label: 'All Statuses' }, { value: 'AWAITING_PAYMENT', label: 'Awaiting Payment' }, { value: 'PARTIALLY_PAID', label: 'Partially Paid' }, { value: 'PAID_PENDING_ACTIVATION', label: 'Pending Activation' }, { value: 'ACTIVE', label: 'Active' }, { value: 'ACTIVE_INSTALLMENT', label: 'Active (Installment)' }, { value: 'ACTIVE_RECURRING', label: 'Active (Recurring)' }, { value: 'AT_RISK_MISSING_PAYMENT', label: 'At Risk' }, { value: 'EXPIRED', label: 'Expired' }, { value: 'CANCELLED', label: 'Cancelled' }, { value: 'LAPSED', label: 'Lapsed' },];
const installmentOptions = [{ value: 'all', label: 'All Payment Types' }, { value: 'installment', label: 'Installment Plans' }, { value: 'full', label: 'Full Payment' },];

export function PoliciesToolbar({
  searchTerm, setSearchTerm,
  statusFilter, setStatusFilter,
  providerFilter, setProviderFilter,
  policyTypeFilter, setPolicyTypeFilter,
  installmentFilter, setInstallmentFilter,
  hasVehicleReg, setHasVehicleReg,
  dateRange, setDateRange,
  onCreateClick
}: PoliciesToolbarProps) {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Correctly derive agencyId from the nested user object detail
  const agencyId = user?.agency_detail?.id;

  const {
    data: dropdownData,
    isLoading: isDropdownLoading,
    isError
  } = useQuery({
    queryKey: ['policy-toolbar-dropdowns', agencyId],
    queryFn: () => getToolbarDropdownData(agencyId!),
    // The query is only enabled after auth is loaded AND we have a valid agencyId
    enabled: !isAuthLoading && !!agencyId,
  });

  // The UI is in a loading state if either auth or the data fetch is in progress
  const isLoading = isAuthLoading || isDropdownLoading;

  const providers = dropdownData?.providers || [];
  const policyTypes = dropdownData?.policyTypes || [];

  const clearAllFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setProviderFilter('all'); setPolicyTypeFilter('all'); setInstallmentFilter('all'); setHasVehicleReg(false); setDateRange(undefined);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || providerFilter !== 'all' || policyTypeFilter !== 'all' || installmentFilter !== 'all' || hasVehicleReg || dateRange;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customer, policy, vehicle..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="h-9 pl-8 w-full" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={onCreateClick} className="h-9 w-full sm:w-auto"> <PlusCircle className="mr-2 h-4 w-4" /> Add New Policy </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-[160px]"> <Filter className="h-4 w-4 mr-2" /> <SelectValue placeholder="Status" /> </SelectTrigger>
          <SelectContent>{statusOptions.map((o) => (<SelectItem key={o.value} value={o.value}> {o.label} </SelectItem>))}</SelectContent>
        </Select>

        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-[160px]"> <Building className="h-4 w-4 mr-2" /> <SelectValue placeholder="Provider" /> </SelectTrigger>
          <SelectContent>
            {isLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
            {isError && <SelectItem value="error" disabled className="text-destructive">Error</SelectItem>}
            {!isLoading && !isError && (
              <>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.length > 0 ? (providers.map((p) => (<SelectItem key={p.id} value={p.id}> {p.name} </SelectItem>))) : (<SelectItem value="no-providers" disabled> No providers found </SelectItem>)}
              </>
            )}
          </SelectContent>
        </Select>

        <Select value={policyTypeFilter} onValueChange={setPolicyTypeFilter}>
          <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-[160px]"> <FileText className="h-4 w-4 mr-2" /> <SelectValue placeholder="Policy Type" /> </SelectTrigger>
          <SelectContent>
            {isLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
            {isError && <SelectItem value="error" disabled className="text-destructive">Error</SelectItem>}
            {!isLoading && !isError && (
              <>
                <SelectItem value="all">All Policy Types</SelectItem>
                {policyTypes.length > 0 ? (policyTypes.map((pt) => (<SelectItem key={pt.id} value={pt.id}> {pt.name} </SelectItem>))) : (<SelectItem value="no-types" disabled> No policy types found </SelectItem>)}
              </>
            )}
          </SelectContent>
        </Select>

        <Select value={installmentFilter} onValueChange={setInstallmentFilter}>
          <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-[160px]"> <CreditCard className="h-4 w-4 mr-2" /> <SelectValue placeholder="Payment Type" /> </SelectTrigger>
          <SelectContent>{installmentOptions.map((o) => (<SelectItem key={o.value} value={o.value}> {o.label} </SelectItem>))}</SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button id="date" variant="outline" className={cn('h-9 w-full sm:w-[240px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}</>) : (format(dateRange.from, 'LLL dd, y'))) : (<span>Filter by start date</span>)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start"> <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /> </PopoverContent>
        </Popover>

        <div className="flex items-center space-x-2">
          <Switch id="vehicle-reg" checked={hasVehicleReg} onCheckedChange={setHasVehicleReg} />
          <Label htmlFor="vehicle-reg" className="flex items-center gap-2 text-sm font-normal"> <Car className="h-4 w-4" /> Has Vehicle Reg </Label>
        </div>

        {hasActiveFilters && (<Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 text-xs"> Clear Filters </Button>)}
      </div>
    </div>
  );
}