'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getReminderLogs, ReminderLog } from '@/services/communicationService';
import { format } from 'date-fns';
import { Search, Info, Mail, MessageSquare, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCallback } from 'react';

export const CommunicationLogsTab = () => {
    const [logs, setLogs] = useState<ReminderLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage] = useState(1);
    const [, setTotalCount] = useState(0);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getReminderLogs({ page: currentPage, search });
            setLogs(response.data.results);
            setTotalCount(response.data.count);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, search]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SENT':
            case 'DELIVERED':
                return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> {status}</Badge>;
            case 'FAILED':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
            case 'QUEUED':
                return <Badge variant="outline" className="text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'SMS':
                return <MessageSquare className="w-4 h-4 text-orange-500" />;
            case 'EMAIL':
                return <Mail className="w-4 h-4 text-blue-500" />;
            default:
                return <div className="flex gap-1"><MessageSquare className="w-3 h-3 text-orange-500" /><Mail className="w-3 h-3 text-blue-500" /></div>;
        }
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                    <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Transmission Logs
                    </CardTitle>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search recipient or content..."
                            className="pl-9 h-9 bg-background/50 border-border/40 focus:bg-background transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="w-[180px]">Recipient</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Message Preview</TableHead>
                                <TableHead className="text-center">Channel</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Sent</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={7}><div className="h-12 bg-muted/20 rounded-lg" /></TableCell>
                                    </TableRow>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-primary/5 transition-colors border-border/40">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{log.recipient_name}</span>
                                                <span className="text-xs text-muted-foreground">{log.recipient_type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{log.reminder_type_display}</span>
                                                {log.policy_number && (
                                                    <span className="xs text-[10px] text-primary/70">{log.policy_number}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[200px] truncate text-xs text-muted-foreground italic">
                                                {log.sms_content || (log.email_subject ? `Subj: ${log.email_subject}` : 'No content')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                {getChannelIcon(log.channel)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {getStatusBadge(log.status)}
                                                {log.status === 'FAILED' && log.error_message && (
                                                    <span className="text-[10px] text-destructive max-w-[120px] truncate" title={log.error_message}>
                                                        {log.error_message}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {log.sent_at ? format(new Date(log.sent_at), 'MMM d, HH:mm') : 'Pending'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all">
                                                        <Info className="w-4 h-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl bg-card border-border shadow-2xl backdrop-blur-xl">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2">
                                                            Communication Details
                                                            {getStatusBadge(log.status)}
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        {log.error_message && (
                                                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2 items-start text-destructive text-sm font-medium">
                                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="font-bold">Transmission Failure</p>
                                                                    <p className="opacity-90">{log.error_message}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {log.sms_content && (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1.5 mb-1">
                                                                        <MessageSquare className="w-3 h-3 text-orange-500" />
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SMS Content</label>
                                                                    </div>
                                                                    <div className="p-3 bg-muted/10 rounded-xl border border-border/30 text-sm whitespace-pre-wrap italic">
                                                                        &quot;{log.sms_content}&quot;
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {log.email_subject && (
                                                                <div className="space-y-3">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-1.5 mb-1">
                                                                            <Mail className="w-3 h-3 text-blue-500" />
                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Details</label>
                                                                        </div>
                                                                        <div className="p-3 bg-muted/10 rounded-xl border border-border/30">
                                                                            <p className="text-[10px] text-muted-foreground uppercase mb-1">Subject</p>
                                                                            <p className="text-sm font-medium">{log.email_subject}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-3 bg-muted/5 rounded-xl border border-dashed border-border/30 text-xs text-muted-foreground">
                                                                        Email sent using template: <br />
                                                                        <span className="font-mono">{log.email_content}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 text-[10px] text-muted-foreground pt-4 border-t border-border/50">
                                                            <div>Created: {format(new Date(log.created_at), 'PPP pp')}</div>
                                                            {log.sent_at && <div className="text-right">Sent: {format(new Date(log.sent_at), 'PPP pp')}</div>}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                                        No transmission logs found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};
