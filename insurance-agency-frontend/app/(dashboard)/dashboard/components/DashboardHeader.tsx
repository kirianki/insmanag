'use client';

import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { AnalyticsScope } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface DashboardHeaderProps {
  scope: AnalyticsScope;
  dateRange: DateRange | undefined;
  setDateRange: (date: DateRange | undefined) => void;
}

export function DashboardHeader({ scope, dateRange, setDateRange }: DashboardHeaderProps) {
  const { user } = useAuth();
  const firstName = user?.first_name || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between mb-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm uppercase tracking-widest">
          <Sparkles className="h-4 w-4" />
          <span>{getGreeting()}</span>
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">{firstName}</span>
        </h2>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          Analytics for <span className="font-bold text-foreground inline-flex items-center px-2 py-0.5 rounded-md bg-secondary whitespace-nowrap">{scope.name}</span>
          <span className="text-xs opacity-50">•</span>
          <span className="uppercase text-[10px] font-bold tracking-tighter text-muted-foreground/70">{scope.level} View</span>
        </p>
      </div>

      <div className="flex items-center space-x-2 w-full md:w-auto">
        <div className="relative w-full md:w-[300px]">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-medium border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-slate-950/80 transition-all shadow-sm",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span className="text-sm">
                      {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                    </span>
                  ) : format(dateRange.from, "MMM dd, yyyy")
                ) : (
                  <span className="text-sm">Filter by date...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="end">
              <div className="p-1 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  className="sm:hidden"
                />
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="hidden sm:block"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}