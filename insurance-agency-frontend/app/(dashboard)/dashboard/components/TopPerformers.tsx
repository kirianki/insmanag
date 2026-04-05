'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnalyticsDashboardResponse } from '@/types/api';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (value?: string | number) => {
  if (value === undefined || value === null) return 'KES 0';
  return `KES ${Number(value).toLocaleString()}`;
};

export function TopPerformers({ performers }: { performers: NonNullable<AnalyticsDashboardResponse['top_performers']> }) {
  const topAgents = performers.agents_by_premium;

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return { icon: Trophy, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/30", label: "Gold" };
      case 1: return { icon: Medal, color: "text-slate-400", bg: "bg-slate-50 dark:bg-slate-400/10", border: "border-slate-200 dark:border-slate-400/30", label: "Silver" };
      case 2: return { icon: Medal, color: "text-orange-400", bg: "bg-orange-50 dark:bg-orange-400/10", border: "border-orange-200 dark:border-orange-400/30", label: "Bronze" };
      default: return { icon: Star, color: "text-muted-foreground/40", bg: "bg-background", border: "border-border/50", label: "" };
    }
  };

  return (
    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Elite Performers
            </CardTitle>
            <CardDescription className="text-xs italic">Top agents by premium volume this period.</CardDescription>
          </div>
          <Star className="h-8 w-8 text-muted-foreground/10 absolute top-4 right-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {topAgents.length > 0 ? topAgents.map((agent, index) => {
          const rank = getRankStyle(index);
          const RankIcon = rank.icon;

          return (
            <div
              key={agent.agent_id}
              className={cn(
                "flex items-center gap-4 p-3 rounded-2xl border transition-all hover:translate-x-1 group",
                rank.border,
                rank.bg
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src="" alt={agent.agent_name} />
                  <AvatarFallback className="font-bold text-xs">
                    {agent.agent_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {index < 3 && (
                  <div className={cn("absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-background shadow-sm border", rank.border)}>
                    <RankIcon className={cn("h-3 w-3", rank.color)} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate">{agent.agent_name}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <TrendingUp className="h-2.5 w-2.5" />
                    {agent.policies_sold} Policies
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-extrabold text-foreground">{formatCurrency(agent.total_premium)}</p>
                {index === 0 && (
                  <span className="text-[9px] font-black italic text-amber-600 uppercase tracking-tighter">Leader</span>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-10">
            <Trophy className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No records found for this period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}