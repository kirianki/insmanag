'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getUsers, getBranches, getRoles, createUser, updateUser, deleteUser } from '@/services/accountsService';
import { User, AgencyBranch } from '@/types/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserForm, UserFormData } from './components/UserForm';
import { useToast } from '@/lib/hooks';
import { BranchUsersCard } from './components/BranchUsersCard';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function StaffManagementPage() {
    const { user } = useAuth();
    const agencyId = user?.agency_detail.id;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: usersData, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['users', agencyId],
        queryFn: () => getUsers({ agency: agencyId }).then(res => res.data),
        enabled: !!agencyId
    });

    const { data: branchesData, isLoading: isLoadingBranches } = useQuery({
        queryKey: ['branches', agencyId],
        queryFn: () => getBranches(agencyId!).then(res => res.data),
        enabled: !!agencyId
    });

    const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
        queryKey: ['roles'],
        queryFn: () => getRoles().then(res => res.data),
    });

    const usersByBranch = useMemo(() => {
        if (!usersData?.results || !branchesData?.results) return { unassigned: [] };
        const grouped: Record<string, User[]> = { unassigned: [] };
        for (const branch of branchesData.results) {
            grouped[branch.id] = [];
        }
        for (const user of usersData.results) {
            const branchId = user.branch_detail?.id;
            if (branchId && grouped[branchId]) {
                grouped[branchId].push(user);
            } else {
                grouped.unassigned.push(user);
            }
        }
        return grouped;
    }, [usersData, branchesData]);

    const mutation = useMutation({
        mutationFn: (userData: UserFormData) => {
            const payload = { ...userData, agency: agencyId };

            // FIX: We acknowledge the type mismatch between the form payload (groups: number[])
            // and the API's read model (groups: Group[]). We use 'as any' to satisfy the
            // TypeScript compiler and disable the ESLint rule because this is a known,
            // deliberate exception.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (selectedUser?.id) return updateUser(selectedUser.id, payload as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return createUser(payload as any);
        },
        onSuccess: () => {
            toast.success(selectedUser ? "User updated" : "User created");
            queryClient.invalidateQueries({ queryKey: ['users', agencyId] });
            setDialogOpen(false);
        },
        onError: (err: unknown) => {
            if (err instanceof Error) {
                toast.error("Failed", { description: err.message });
            } else {
                toast.error("Failed", { description: "An unexpected error occurred." });
            }
        },
    });

    const handleDelete = (user: User) => {
        setUserToDelete(user);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            await deleteUser(userToDelete.id);
            toast.success("User deleted", {
                description: "All records have been reassigned to an Agency Admin."
            });
            queryClient.invalidateQueries({ queryKey: ['users', agencyId] });
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error("Delete failed", { description: err.message });
            } else {
                toast.error("Delete failed", { description: "An unexpected error occurred." });
            }
        } finally {
            setDeleteConfirmOpen(false);
            setUserToDelete(null);
        }
    };

    const isLoading = isLoadingUsers || isLoadingBranches || isLoadingRoles;

    return (
        <div className="space-y-6">
            <PageHeader title="Staff Management" actionButtonText="Add User" onActionButtonClick={() => { setSelectedUser(null); setDialogOpen(true); }} />

            {isLoading ? (
                <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
            ) : (
                <div className="space-y-6">
                    {/* Unassigned Users (e.g. Agency Admin) */}
                    {usersByBranch.unassigned.length > 0 && (
                        <BranchUsersCard
                            branch={{ id: 'unassigned', branch_name: 'Unassigned Staff / Administrators' } as unknown as AgencyBranch}
                            users={usersByBranch.unassigned}
                            onEdit={(userToEdit) => { setSelectedUser(userToEdit); setDialogOpen(true); }}
                            onDelete={handleDelete}
                        />
                    )}

                    {/* Branch Users */}
                    {branchesData?.results.map(branch => (
                        <BranchUsersCard
                            key={branch.id}
                            branch={branch}
                            users={usersByBranch[branch.id] || []}
                            onEdit={(userToEdit) => { setSelectedUser(userToEdit); setDialogOpen(true); }}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{selectedUser ? "Edit User" : "Create New User"}</DialogTitle></DialogHeader>
                    {!isLoadingBranches && !isLoadingRoles && (
                        <UserForm
                            initialData={selectedUser}
                            branches={branchesData?.results || []}
                            roles={rolesData?.results || []}
                            onSubmit={(data) => mutation.mutate(data)}
                            isPending={mutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. All policies, commissions, and other records assigned to
                            <strong> {userToDelete?.first_name} {userToDelete?.last_name}</strong> will be
                            reassigned to an active Agency Admin.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}