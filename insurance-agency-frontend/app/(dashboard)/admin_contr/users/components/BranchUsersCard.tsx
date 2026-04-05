'use client';

import { AgencyBranch, User } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

interface BranchUsersCardProps {
    branch: AgencyBranch;
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}

export function BranchUsersCard({ branch, users, onEdit, onDelete }: BranchUsersCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{branch.branch_name}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>{user.first_name} {user.last_name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem asChild><Link href={`/admin_contr/users/${user.id}`}>View Details</Link></DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEdit(user)}>Edit</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-500" onClick={() => onDelete(user)}>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No users in this branch.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}