// app/(dashboard)/dashboard/components/KpiCards.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardKPIs } from '@/types/api';
import { DollarSign, ShieldCheck, Percent, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (value?: string | number) => {
  if (value === undefined || value === null) return 'KES 0';
  return `KES ${Number(value).toLocaleString()}`;
};

interface StatCardProps {
  title: string;
  mtdValue: string | number;
  ytdValue: string | number;
  mtdLabel: string;
  ytdLabel: string;
  icon: React.ElementType;
  isCurrency?: boolean;
  colorClassName: string;
  pendingMtd?: string | number;
}

function StatCard({
  title,
  mtdValue,
  ytdValue,
  mtdLabel,
  ytdLabel,
  icon: Icon,
  isCurrency = true,
  colorClassName,
  pendingMtd
}: StatCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm group hover:shadow-lg transition-all duration-300">
      <div className={cn("absolute top-0 left-0 w-1 h-full", colorClassName)} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110 duration-300",
          colorClassName.replace('bg-', 'bg-opacity-10 text-').replace('-500', '')
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {isCurrency ? formatCurrency(mtdValue) : mtdValue}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase">{mtdLabel}</span>
          </div>

          {pendingMtd && Number(pendingMtd) > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 mb-1">
              <TrendingUp className="h-3 w-3" />
              {formatCurrency(pendingMtd)} pending
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-foreground/80">
                {isCurrency ? formatCurrency(ytdValue) : ytdValue}
              </span>
              <span className="text-[9px] font-medium text-muted-foreground uppercase">{ytdLabel}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ kpis }: { kpis: DashboardKPIs }) {
  const mtd = kpis.mtd;
  const ytd = kpis.ytd;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Policies & Premium */}
      <StatCard
        title="Policies & Premium"
        mtdValue={mtd.premium}
        ytdValue={ytd.premium}
        mtdLabel="MTD"
        ytdLabel="YTD"
        icon={DollarSign}
        colorClassName="bg-blue-500"
      />

      {/* 2. Agency Commission */}
      <StatCard
        title="Agency Commission"
        mtdValue={mtd.commission_earned}
        ytdValue={ytd.commission_earned}
        mtdLabel="MTD"
        ytdLabel="YTD"
        pendingMtd={mtd.commission_earned_pending}
        icon={ShieldCheck}
        colorClassName="bg-emerald-500"
      />

      {/* 3. Claims Experience */}
      <StatCard
        title="Claims Summary"
        mtdValue={mtd.claims_count}
        ytdValue={ytd.claims_count}
        mtdLabel="MTD Count"
        ytdLabel="YTD Count"
        icon={AlertCircle}
        isCurrency={false}
        colorClassName="bg-rose-500"
      />

      {/* 4. Lead conversion / Growth */}
      <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm group hover:shadow-lg transition-all duration-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Conversion</CardTitle>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 transition-transform group-hover:scale-110 duration-300">
            <Percent className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-3xl font-bold tracking-tight">{kpis.lead_conversion_rate_percent}%</div>
          <p className="text-[10px] font-medium text-muted-foreground mt-1">Lead-to-customer rate</p>

          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border/50">
            <div className="text-sm font-medium text-indigo-600">Performance is stable</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}