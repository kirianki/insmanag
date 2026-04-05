'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserById } from '@/services/accountsService';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, Briefcase, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CommissionRulesTab } from './components/CommissionRulesTab';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffContractTab } from "./components/StaffContractTab";
import { PaymentHistoryTab } from "./components/PaymentHistoryTab";

export default function UserDetailPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const segments = pathname.split('/').filter(Boolean);
        const id = segments[segments.length - 1];
        setUserId(id);
    }, [pathname]);

    const { data: user, isLoading, isError, error } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => getUserById(userId!).then(res => res.data),
        enabled: !!userId,
    });

    if (isError) {
        return (
            <div>
                <p>Error loading user: {error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
            </div>
        )
    }

    if (isLoading || !user) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-9 w-48" />
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const userInitials = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`;

    return (
        <div className="space-y-6">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Staff Management
            </Button>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.profile?.profile_picture} alt={`${user.first_name} ${user.last_name}`} />
                            <AvatarFallback>{userInitials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                                <div className="flex items-center"><Mail className="mr-1.5 h-4 w-4" /> {user.email}</div>
                                {user.profile?.phone_number && <div className="flex items-center"><Phone className="mr-1.5 h-4 w-4" /> {user.profile.phone_number}</div>}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                        <strong>Role:</strong>
                        <div className="ml-2 flex gap-1">
                            {user.roles.map((r, index) => {
                                const roleName = typeof r === 'string' ? r : (r as { name: string }).name;
                                const roleKey = typeof r === 'string' ? r : (r as { id: string }).id;
                                return <Badge key={`${roleKey}-${index}`}>{roleName}</Badge>;
                            })}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                        <strong>Branch:</strong>
                        <span className="ml-2">{user.branch_detail?.branch_name || "Unassigned"}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Financials Logic */}
            <Tabs defaultValue="commissions" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="commissions">Commission Rules</TabsTrigger>
                    <TabsTrigger value="contract">Staff Contract</TabsTrigger>
                    <TabsTrigger value="payments">Payment History</TabsTrigger>
                </TabsList>
                <TabsContent value="commissions" className="mt-4">
                    <CommissionRulesTab userId={userId!} />
                </TabsContent>
                <TabsContent value="contract" className="mt-4">
                    <StaffContractTab userId={userId!} />
                </TabsContent>
                <TabsContent value="payments" className="mt-4">
                    <PaymentHistoryTab userId={userId!} />
                </TabsContent>
            </Tabs>
        </div>
    );
}