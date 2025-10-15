// components/features/dashboard/dashboard-filters.tsx
'use client';

import { DateRange } from "react-day-picker";
import { Button } from "../../../components/ui/button";
import { DatePickerWithRange } from "../../../components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { User, AgencyBranch } from "../../../types";
import { X } from "lucide-react";

interface DashboardFiltersProps {
  dateRange?: DateRange;
  onDateChange: (date: DateRange | undefined) => void;
  agents?: User[];
  selectedAgent: string;
  onAgentChange: (agentId: string) => void;
  branches?: AgencyBranch[];
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  enableBranchFilter: boolean;
}

export function DashboardFilters({
  dateRange, onDateChange, agents, selectedAgent, onAgentChange,
  branches, selectedBranch, onBranchChange, enableBranchFilter
}: DashboardFiltersProps) {

  const handleReset = () => {
    onDateChange(undefined);
    onAgentChange("all");
    if (enableBranchFilter) onBranchChange("all");
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      <DatePickerWithRange date={dateRange} onDateChange={onDateChange} />
      {agents && (
        <Select value={selectedAgent} onValueChange={onAgentChange}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Agents" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>{`${agent.first_name} ${agent.last_name}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {enableBranchFilter && branches && (
        <Select value={selectedBranch} onValueChange={onBranchChange}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Branches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>{branch.branch_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button variant="ghost" size="icon" onClick={handleReset} aria-label="Reset filters">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}