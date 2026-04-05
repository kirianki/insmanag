'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { AnalyticsDashboardResponse } from '@/types/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const formatCurrency = (value?: string | number) => {
    if (value === undefined || value === null) return 'KES 0';
    return `KES ${Number(value).toLocaleString()}`;
};

function ActivityItem({
    title,
    subtitle,
    metadata,
    date,
    icon: Icon,
    iconColor,
    href
}: {
    title: React.ReactNode;
    subtitle: string;
    metadata?: string;
    date: string;
    icon: React.ElementType;
    iconColor: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-background/80 transition-all group"
        >
            <div className={cn("p-2.5 rounded-xl bg-background shadow-sm border border-border/50 flex-shrink-0 group-hover:scale-105 transition-transform", iconColor)}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground truncate">{title}</p>
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap bg-secondary px-1.5 py-0.5 rounded uppercase">
                        {format(new Date(date), 'MMM dd')}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                    {metadata && (
                        <span className="text-xs font-semibold text-foreground/80">{metadata}</span>
                    )}
                </div>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </Link>
    );
}

export function RecentActivity({ activity }: { activity: AnalyticsDashboardResponse['recent_activity'] }) {
    return (
        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            Pulse Feed
                        </CardTitle>
                        <CardDescription className="text-xs italic">Live updates from your agency floor.</CardDescription>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground/10 absolute top-4 right-4" />
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="policies" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-xl h-9 mb-4">
                        <TabsTrigger value="policies" className="rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            Policies ({activity.policies_sold.length})
                        </TabsTrigger>
                        <TabsTrigger value="claims" className="rounded-lg text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            Claims ({activity.claims_filed.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="policies" className="mt-0 space-y-1">
                        {activity.policies_sold.length > 0 ? (
                            activity.policies_sold.map(policy => (
                                <ActivityItem
                                    key={policy.policy_id}
                                    title={policy.customer_name}
                                    subtitle={policy.policy_number}
                                    metadata={formatCurrency(policy.premium)}
                                    date={policy.date}
                                    icon={FileText}
                                    iconColor="text-blue-500"
                                    href={`/policies/${policy.policy_id}`}
                                />
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-sm text-muted-foreground">No recent policy activity.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="claims" className="mt-0 space-y-1">
                        {activity.claims_filed.length > 0 ? (
                            activity.claims_filed.map(claim => (
                                <ActivityItem
                                    key={claim.claim_id}
                                    title={claim.customer_name}
                                    subtitle={claim.claim_number}
                                    metadata={`Policy: ${claim.policy_number}`}
                                    date={claim.date}
                                    icon={AlertTriangle}
                                    iconColor="text-orange-500"
                                    href={`/claims/${claim.claim_id}`}
                                />
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-sm text-muted-foreground">No recent claim activity.</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}