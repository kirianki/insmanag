'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProductionThresholdProgress } from '@/services/analyticsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentThresholdProgressResponse } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, TrendingUp, Users, User as UserIcon, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ThresholdProgress({ agentId: propAgentId }: { agentId?: string }) {
    const { user: authUser } = useAuth();
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['productionThreshold', propAgentId],
        queryFn: () => getProductionThresholdProgress(propAgentId).then(res => res.data),
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Card className="overflow-hidden border-none shadow-md">
                    <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-1/2 mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-8 w-24" />
                                <Skeleton className="h-8 w-24" />
                            </div>
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isMultiAgent = Array.isArray(data);
    const allAgents = isMultiAgent ? (data as AgentThresholdProgressResponse[]) : [];

    // Determine which agent's progress to show in detail
    const detailAgentId = propAgentId || selectedAgentId;
    const detailAgentData = isMultiAgent
        ? allAgents.find(a => a.agent_id === detailAgentId)
        : (data as AgentThresholdProgressResponse);

    const progressList = detailAgentData?.progress || [];

    // Render Individual Detail View
    if (detailAgentId || !isMultiAgent) {
        if (!progressList || progressList.length === 0) {
            if (isMultiAgent) return null; // Should ideally handle this in team view
            return null;
        }

        const isMe = detailAgentId === authUser?.id || (!isMultiAgent && !propAgentId);

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-2">
                        {isMe ? 'My Targets' : `${detailAgentData?.agent_name}'s Targets`}
                    </h3>
                    {isMultiAgent && !propAgentId && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAgentId(null)} className="h-7 text-[10px] font-bold uppercase">
                            <ArrowLeft className="h-3 w-3 mr-1" /> Team View
                        </Button>
                    )}
                </div>
                {progressList.map((prog) => (
                    <Card key={prog.rule_id} className="overflow-hidden border-none shadow-md bg-gradient-to-br from-white to-blue-50/30">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    {prog.policy_type_name} Target
                                </CardTitle>
                                {prog.is_reached && (
                                    <div className="flex items-center gap-1 text-xs font-bold text-green-600 animate-pulse">
                                        <CheckCircle2 className="h-4 w-4" />
                                        REACHED
                                    </div>
                                )}
                            </div>
                            <CardDescription className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                                Basis: {prog.payout_basis_display}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Earned</span>
                                        <span className="text-lg font-black text-primary">KES {Number(prog.current_production).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Target</span>
                                        <span className="text-sm font-bold">KES {Number(prog.threshold).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full shadow-sm ${prog.is_reached ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                        style={{ width: `${Math.min(100, prog.percentage_complete)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center bg-slate-100/50 p-2 rounded-lg border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Monthly Progress</span>
                                    <span className={`text-xs font-black ${prog.is_reached ? 'text-green-600' : 'text-blue-600'}`}>
                                        {prog.percentage_complete}%
                                    </span>
                                </div>

                                {!prog.is_reached ? (
                                    <div className="text-center pt-1">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                            <span className="text-primary font-black">KES {Number(prog.remaining).toLocaleString()}</span> more to unlock commission
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center pt-1">
                                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">
                                            Threshold met! Earning {prog.policy_type_name === 'General (All Policies)' ? '' : prog.policy_type_name} commission
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // Render Team List View (Managers/Admins)
    const filteredAgents = allAgents
        .filter(a =>
            a.agent_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (a.agent_id === authUser?.id) return -1;
            if (b.agent_id === authUser?.id) return 1;
            return a.agent_name.localeCompare(b.agent_name);
        });

    return (
        <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Team Targets
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-bold">{allAgents.length} Agents</Badge>
                </div>
            </CardHeader>
            <div className="p-3 border-b bg-white">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search team..."
                        className="pl-8 h-8 text-xs bg-slate-50 border-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto overflow-x-hidden">
                <div className="divide-y divide-slate-50">
                    {filteredAgents.map(agent => {
                        const isMe = agent.agent_id === authUser?.id;
                        // Calculate an overall percentage (average of targets)
                        const avgProgress = agent.progress.length > 0
                            ? Math.round(agent.progress.reduce((acc, curr) => acc + curr.percentage_complete, 0) / agent.progress.length)
                            : 0;

                        return (
                            <div
                                key={agent.agent_id}
                                onClick={() => setSelectedAgentId(agent.agent_id)}
                                className="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors group relative"
                            >
                                {isMe && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isMe ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                            <UserIcon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold ${isMe ? 'text-primary' : 'text-slate-700'}`}>
                                                {agent.agent_name} {isMe && "(You)"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase">
                                                {agent.progress.length} Targets Defined
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-black ${avgProgress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                                            {avgProgress}%
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-700 ${avgProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min(100, avgProgress)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
            {allAgents.length > filteredAgents.length && filteredAgents.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                    No agents found matching &quot;{searchQuery}&quot;
                </div>
            )}
        </Card>
    );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: 'outline' | 'default', className?: string }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${variant === 'outline' ? 'border border-slate-200 text-slate-500' : 'bg-primary text-white'} ${className}`}>
            {children}
        </span>
    );
}
