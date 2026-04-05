'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "./components/ProfileForm";
import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'profile';

    return (
        <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-4">
                <ProfileForm />
            </TabsContent>
            <TabsContent value="security" className="mt-4">
                <ChangePasswordForm />
            </TabsContent>
        </Tabs>
    );
}