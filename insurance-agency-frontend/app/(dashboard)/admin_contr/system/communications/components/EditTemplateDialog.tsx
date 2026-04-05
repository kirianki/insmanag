'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReminderTemplate, updateReminderTemplate } from '@/services/communicationService';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

interface EditTemplateDialogProps {
    template: ReminderTemplate;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditTemplateDialog = ({ template, isOpen, onClose, onSuccess }: EditTemplateDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        sms_template: template.sms_template || '',
        email_subject_template: template.email_subject_template || '',
        email_body_template: template.email_body_template || '',
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateReminderTemplate(template.id, formData);
            toast.success('Template updated successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update template');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Template: {template.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-bold opacity-70">SMS Template</Label>
                        <Textarea
                            value={formData.sms_template}
                            onChange={(e) => setFormData({ ...formData, sms_template: e.target.value })}
                            placeholder="Type SMS content here..."
                            className="min-h-[100px] bg-muted/20"
                        />
                        <p className="text-[10px] text-muted-foreground italic">Use {"{{customer_name}}"}, {"{{policy_number}}"} etc as placeholders.</p>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <Label className="text-sm font-bold opacity-70">Email Template</Label>
                        <div className="space-y-2">
                            <Label className="text-xs">Subject</Label>
                            <Input
                                value={formData.email_subject_template}
                                onChange={(e) => setFormData({ ...formData, email_subject_template: e.target.value })}
                                placeholder="Email subject..."
                                className="bg-muted/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Body (Markdown/Text)</Label>
                            <Textarea
                                value={formData.email_body_template}
                                onChange={(e) => setFormData({ ...formData, email_body_template: e.target.value })}
                                placeholder="Type Email body content here..."
                                className="min-h-[200px] bg-muted/20"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="rounded-xl">
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
