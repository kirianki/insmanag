import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Bell,
  Repeat,
  CalendarClock,
  RefreshCw,
  ArrowRight,
  TrendingDown,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ExpiringPolicy,
  ExpiringRenewal,
  InstallmentAlert,
  UpcomingRecurringPayment
} from '@/types/api';

interface ActionableInsightsData {
  expiring_policies_in_30_days?: ExpiringPolicy[];
  upcoming_renewals_in_30_days?: ExpiringRenewal[];
  upcoming_installments_in_10_days?: InstallmentAlert[];
  upcoming_recurring_payments_in_10_days?: UpcomingRecurringPayment[];
}

interface ActionableInsightsProps {
  insights: ActionableInsightsData;
}

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(Number(amount));
};

interface SectionHeaderProps {
  title: string;
  count: number;
  icon: React.ElementType;
  iconClassName?: string;
}

function SectionHeader({ title, count, icon: Icon, iconClassName }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg bg-background shadow-sm border border-border/50", iconClassName)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">{title}</h4>
      </div>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
        {count}
      </span>
    </div>
  );
}

export function ActionableInsights({ insights }: ActionableInsightsProps) {
  const expiringPolicies = insights?.expiring_policies_in_30_days || [];
  const upcomingRenewals = insights?.upcoming_renewals_in_30_days || [];
  const upcomingInstallments = insights?.upcoming_installments_in_10_days || [];
  const upcomingRecurringPayments = insights?.upcoming_recurring_payments_in_10_days || [];

  const hasInsights =
    expiringPolicies.length > 0 ||
    upcomingRenewals.length > 0 ||
    upcomingInstallments.length > 0 ||
    upcomingRecurringPayments.length > 0;

  if (!hasInsights) {
    return (
      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="p-4 rounded-full bg-secondary/50 mb-4">
            <Bell className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">All clear! No pending insights.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm lg:col-span-3">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-indigo-500" />
              Focus Areas
            </CardTitle>
            <CardDescription className="text-xs">
              Direct actions to improve retention and collections.
            </CardDescription>
          </div>
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                <div className="h-full w-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20" />
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {/* Section 1: Expiring Policies */}
        {expiringPolicies.length > 0 && (
          <div className="group">
            <SectionHeader
              title="Expiring Policies"
              count={expiringPolicies.length}
              icon={Clock}
              iconClassName="text-rose-500"
            />
            <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {expiringPolicies.map(policy => (
                <Link
                  key={policy.policy_id}
                  href={`/policies/${policy.policy_id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-transparent bg-background/40 hover:bg-background/80 hover:border-border/50 transition-all group/item"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold truncate max-w-[150px]">{policy.customer_name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{policy.policy_number}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[11px] font-bold text-rose-600">
                      {format(new Date(policy.expiry_date), 'dd MMM')}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                      Expires <ArrowRight className="h-2 w-2 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Upcoming renewals */}
        {upcomingRenewals.length > 0 && (
          <div className="group">
            <SectionHeader
              title="Renewals Due"
              count={upcomingRenewals.length}
              icon={Repeat}
              iconClassName="text-blue-500"
            />
            <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {upcomingRenewals.map(renewal => (
                <Link
                  key={renewal.renewal_id}
                  href={`/customers/${renewal.customer_id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-transparent bg-background/40 hover:bg-background/80 hover:border-border/50 transition-all group/item"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold truncate max-w-[150px]">{renewal.customer_name}</span>
                    <span className="text-[10px] text-muted-foreground">{renewal.policy_type}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[11px] font-bold text-blue-600">
                      {format(new Date(renewal.renewal_date), 'dd MMM')}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase">Renewal</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Upcoming Installments */}
        {upcomingInstallments.length > 0 && (
          <div className="group">
            <SectionHeader
              title="Collections"
              count={upcomingInstallments.length}
              icon={CalendarClock}
              iconClassName="text-amber-500"
            />
            <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {upcomingInstallments.map(installment => (
                <Link
                  key={installment.installment_id}
                  href={`/policies/${installment.policy_id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-transparent bg-background/40 hover:bg-background/80 hover:border-border/50 transition-all group/item"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold truncate max-w-[150px]">{installment.customer_name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{installment.policy_number}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[11px] font-bold text-amber-600">
                      {formatCurrency(installment.amount_due)}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase">
                      Due {format(new Date(installment.due_date), 'dd MMM')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Recurring Payments */}
        {upcomingRecurringPayments.length > 0 && (
          <div className="group">
            <SectionHeader
              title="Recurring Subscriptions"
              count={upcomingRecurringPayments.length}
              icon={RefreshCw}
              iconClassName="text-emerald-500"
            />
            <div className="max-h-[220px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {upcomingRecurringPayments.map(payment => (
                <Link
                  key={payment.policy_id}
                  href={`/policies/${payment.policy_id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-transparent bg-background/40 hover:bg-background/80 hover:border-border/50 transition-all group/item"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold truncate max-w-[150px]">{payment.customer_name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{payment.policy_number}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[11px] font-bold text-emerald-600">
                      {formatCurrency(payment.amount_due)}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase">
                      {payment.frequency} • {format(new Date(payment.next_due_date), 'dd MMM')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}