'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Claim } from '@/types/api';
import Link from 'next/link';
import { Calendar, DollarSign, User, Shield, AlertTriangle, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const DetailRow = ({ 
  icon: Icon, 
  label, 
  value, 
  href 
}: { 
  icon: React.ElementType; 
  label: string; 
  value?: string | number | null; 
  href?: string; 
}) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </div>
        {href ? (
            <Link href={href} className="text-sm font-medium text-blue-600 hover:underline">
                {value || 'N/A'}
            </Link>
        ) : (
            <span className="text-sm font-medium">{value || 'N/A'}</span>
        )}
    </div>
);

export function ClaimInfoCard({ title, claim }: { title: string, claim: Claim }) {
    if (title === 'Policy Information') {
        return (
            <Card>
                <CardHeader><CardTitle className="text-base">Policy & Claimant</CardTitle></CardHeader>
                <CardContent>
                    <DetailRow icon={Shield} label="Policy Number" value={claim.policy_number} href={`/policies/${claim.policy}`} />
                    <Separator />
                    <DetailRow icon={User} label="Claimant Name" value={claim.claimant_name} href={`/customers/${claim.claimant}`} />
                    <Separator />
                    <DetailRow icon={FileText} label="Reported By" value={claim.reported_by_email} />
                </CardContent>
            </Card>
        );
    }

    // Default: Claim Summary
    return (
        <Card>
            <CardHeader><CardTitle className="text-base">Incident Details</CardTitle></CardHeader>
            <CardContent>
                <DetailRow icon={Calendar} label="Date of Loss" value={new Date(claim.date_of_loss).toLocaleDateString()} />
                <Separator />
                <DetailRow icon={DollarSign} label="Estimated Loss" value={claim.estimated_loss_amount ? `KES ${Number(claim.estimated_loss_amount).toLocaleString()}` : '-'} />
                <Separator />
                <DetailRow icon={DollarSign} label="Settled Amount" value={claim.settled_amount ? `KES ${Number(claim.settled_amount).toLocaleString()}` : '-'} />
                
                <div className="mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Description</span>
                    </div>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                        {claim.loss_description}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}