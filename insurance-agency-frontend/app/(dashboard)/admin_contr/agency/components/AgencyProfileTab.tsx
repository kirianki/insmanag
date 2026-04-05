'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getAgencyById, updateAgency } from '@/services/accountsService';
import { Agency } from '@/types/api';
import { useToast } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';

interface AgencyProfileTabProps {
    agencyId: string;
}

interface AgencyFormValues {
    agency_name: string;
    agency_code: string;
    mpesa_shortcode: string;
}

export function AgencyProfileTab({ agencyId }: AgencyProfileTabProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: agency, isLoading } = useQuery({
        queryKey: ['agency', agencyId],
        queryFn: () => getAgencyById(agencyId).then(res => res.data),
    });

    const { register, handleSubmit, formState: { isDirty } } = useForm<AgencyFormValues>({
        values: {
            agency_name: agency?.agency_name || '',
            agency_code: agency?.agency_code || '',
            mpesa_shortcode: agency?.mpesa_shortcode || '',
        }
    });

    const mutation = useMutation({
        mutationFn: (data: Partial<Agency>) => updateAgency(agencyId, data),
        onSuccess: () => {
            toast.success("Agency profile updated successfully");
            queryClient.invalidateQueries({ queryKey: ['agency', agencyId] });
            queryClient.invalidateQueries({ queryKey: ['user'] }); // Refresh user info in case agency name changed
        },
        onError: (error: unknown) => {
            let detail = "An unexpected error occurred.";
            if (isAxiosError(error)) {
                detail = error.response?.data?.detail || error.message || detail;
            } else if (error instanceof Error) {
                detail = error.message;
            }
            toast.error("Update failed", { description: detail });
        }
    });

    const onSubmit = (data: AgencyFormValues) => {
        mutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
                <Label htmlFor="agency_name">Agency Name</Label>
                <Input
                    id="agency_name"
                    {...register('agency_name', { required: true })}
                    placeholder="e.g. Acme Insurance Agency"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="agency_code">Agency Code</Label>
                <Input
                    id="agency_code"
                    {...register('agency_code', { required: true })}
                    placeholder="e.g. ACME-001"
                    disabled // Agency code is usually unique and immutable from UI
                />
                <p className="text-xs text-muted-foreground">Unique identifier for your agency. Contact support to change this.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="mpesa_shortcode">MPESA Shortcode (Paybill)</Label>
                <Input
                    id="mpesa_shortcode"
                    {...register('mpesa_shortcode')}
                    placeholder="e.g. 123456"
                />
                <p className="text-xs text-muted-foreground text-amber-600 font-medium">Changing this will affect how customers pay for policies.</p>
            </div>

            <div className="pt-4">
                <Button
                    type="submit"
                    disabled={!isDirty || mutation.isPending}
                >
                    {mutation.isPending ? "Saving Changes..." : "Save Changes"}
                </Button>
            </div>
        </form>
    );
}
