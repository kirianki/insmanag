'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CommunicationLogsTab } from './components/CommunicationLogsTab';
import { CommunicationTemplatesTab } from './components/CommunicationTemplatesTab';
import { Activity, LayoutTemplate, Send, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CommunicationsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <PageHeader
                    title="Communication Hub"
                    subtitle="Monitor, audit, and manage all automated SMS and Email system reminders."
                />

                <div className="flex gap-2">
                    <Card className="bg-primary/5 border-primary/20 shadow-none px-4 py-2 flex items-center gap-3 rounded-2xl">
                        <Activity className="w-5 h-5 text-primary animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">Gateway Status</span>
                            <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3" />
                                Operational
                            </span>
                        </div>
                    </Card>
                </div>
            </div>

            <Tabs defaultValue="logs" className="w-full">
                <TabsList className="bg-muted/40 p-1.5 rounded-2xl h-auto gap-2 border border-border/40 backdrop-blur-md">
                    <TabsTrigger
                        value="logs"
                        className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all flex items-center gap-2 font-semibold"
                    >
                        <Send className="w-4 h-4" />
                        Transmission History
                    </TabsTrigger>
                    <TabsTrigger
                        value="templates"
                        className="rounded-xl px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all flex items-center gap-2 font-semibold"
                    >
                        <LayoutTemplate className="w-4 h-4" />
                        Message Templates
                    </TabsTrigger>
                </TabsList>

                <div className="mt-8">
                    <TabsContent value="logs" className="focus-visible:outline-none">
                        <CommunicationLogsTab />
                    </TabsContent>
                    <TabsContent value="templates" className="focus-visible:outline-none">
                        <CommunicationTemplatesTab />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
