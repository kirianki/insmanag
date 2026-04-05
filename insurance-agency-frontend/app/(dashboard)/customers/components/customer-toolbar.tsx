'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomersToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  onCreateClick: () => void;
}

const kycStatusOptions = [
  { value: 'all', label: 'All KYC Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function CustomersToolbar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onCreateClick,
}: CustomersToolbarProps) {
  return (
    // CHANGE: Main container now stacks vertically on mobile (flex-col) and goes to a row on small screens and up (sm:flex-row)
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
      {/* CHANGE: Filter group also stacks and expands */}
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
        <div className="relative w-full sm:w-auto sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          {/* CHANGE: Make select full width on mobile, fixed on larger */}
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
            <SelectValue placeholder="Filter by KYC" />
          </SelectTrigger>
          <SelectContent>
            {kycStatusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* CHANGE: Make button full width on mobile, auto on larger */}
      <Button onClick={onCreateClick} className="h-9 w-full sm:w-auto">
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Customer
      </Button>
    </div>
  );
}