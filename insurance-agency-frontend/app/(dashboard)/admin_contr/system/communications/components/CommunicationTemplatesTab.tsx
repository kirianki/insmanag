'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getReminderTemplates, updateReminderTemplate, ReminderTemplate } from '@/services/communicationService';
import { Edit2, FileText, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { EditTemplateDialog } from './EditTemplateDialog';

export const CommunicationTemplatesTab = () => {
    const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await getReminderTemplates();
            setTemplates(response.data.results);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await updateReminderTemplate(id, { is_active: !currentStatus });
            setTemplates(templates.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t));
            toast.success(`Template ${!currentStatus ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="animate-pulse bg-card/40 border-border/20 h-48 rounded-2xl" />
                ))
            ) : templates.length > 0 ? (
                templates.map((template) => (
                    <Card key={template.id} className="group overflow-hidden border border-border/50 bg-card hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 rounded-2xl">
                        <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter bg-background/50 border-primary/20 text-primary px-1.5 h-5">
                                            {template.reminder_type_display}
                                        </Badge>
                                        {!template.is_active && (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Inactive</Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">{template.name}</CardTitle>
                                </div>
                                <Switch
                                    checked={template.is_active}
                                    onCheckedChange={() => handleToggleStatus(template.id, template.is_active)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                        <Smartphone className="w-3 h-3 text-orange-400" />
                                        SMS Preview
                                    </div>
                                    <p className="text-xs line-clamp-2 italic text-muted-foreground/80 bg-muted/20 p-2 rounded-lg border border-border/30">
                                        {template.sms_template || 'No SMS template configured.'}
                                    </p>
                                </div>
                                <div className="flex-1 space-y-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                        <FileText className="w-3 h-3 text-blue-400" />
                                        Email Preview
                                    </div>
                                    <p className="text-xs line-clamp-2 italic text-muted-foreground/80 bg-muted/20 p-2 rounded-lg border border-border/30">
                                        {template.email_subject_template || 'No Email template configured.'}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs font-bold gap-1.5 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all"
                                    onClick={() => setEditingTemplate(template)}
                                >
                                    <Edit2 className="w-3 h-3" />
                                    Edit Content
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground italic border-2 border-dashed border-border/40 rounded-3xl">
                    No reminder templates configured yet.
                </div>
            )}

            {editingTemplate && (
                <EditTemplateDialog
                    template={editingTemplate}
                    isOpen={!!editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    onSuccess={fetchTemplates}
                />
            )}
        </div>
    );
};
