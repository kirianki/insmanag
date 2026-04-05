"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, getYear } from "date-fns";

export type ViewType = "monthly" | "annual";

interface PeriodFilterProps {
    viewType: ViewType;
    setViewType: (v: ViewType) => void;
    selectedYear: number;
    setSelectedYear: (y: number) => void;
    selectedMonth: number | "all"; // 0-11 or "all"
    setSelectedMonth: (m: number | "all") => void;
}

export function PeriodFilter({
    viewType,
    setViewType,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
}: PeriodFilterProps) {
    const currentYear = getYear(new Date());
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        { value: "all", label: "All Months" },
        ...Array.from({ length: 12 }, (_, i) => ({
            value: i,
            label: format(new Date(2000, i, 1), "MMMM"),
        })),
    ];

    return (
        <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
            <div className="space-y-1.5">
                <Label>View Type</Label>
                <Select value={viewType} onValueChange={(v: ViewType) => setViewType(v)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="View Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((y) => (
                            <SelectItem key={y} value={y.toString()}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {viewType === "monthly" && (
                <div className="space-y-1.5">
                    <Label>Month</Label>
                    <Select
                        value={selectedMonth.toString()}
                        onValueChange={(v) => setSelectedMonth(v === "all" ? "all" : parseInt(v))}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m.value} value={m.value.toString()}>
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
}
