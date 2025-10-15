// components/features/dashboard/kpis-grid.tsx
'use client';

import { FileText, DollarSign, BarChart, AlertTriangle, Users } from 'lucide-react';
import { StatsCard } from './stats-card';
import { KPIs } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

interface KPIsGridProps {
  kpis: KPIs;
}

export function KPIsGrid({ kpis }: KPIsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard title="Policies Sold" value={kpis.policies_sold} icon={FileText} />
      <StatsCard title="Premium Written" value={formatCurrency(kpis.total_premium_written)} icon={DollarSign} />
      <StatsCard title="Commission (Approved)" value={formatCurrency(kpis.commission_earned_approved)} icon={BarChart} />
      <StatsCard title="Lead Conversion" value={`${kpis.lead_conversion_rate_percent}%`} icon={Users} />
      <StatsCard title="Pending Commissions" value={formatCurrency(kpis.commission_earned_pending)} icon={BarChart} />
      <StatsCard
        title="Claims Filed"
        value={kpis.claims_filed_count}
        icon={AlertTriangle}
        description={`Total Value: ${formatCurrency(kpis.claims_total_value)}`}
      />
    </div>
  );
}