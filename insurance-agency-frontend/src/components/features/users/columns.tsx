// components/features/users/columns.tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { User } from '../../../types';
import { Badge } from '../../../components/ui/badge';

export const userColumns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => `${row.first_name} ${row.last_name}`.trim(),
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium" aria-label={`${user.first_name} ${user.last_name}`}>
            {user.first_name} {user.last_name}
          </span>
          {user.branch_detail ? (
            <span className="text-xs text-muted-foreground" aria-label={`Branch: ${user.branch_detail.branch_name}`}>
              {user.branch_detail.branch_name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground" aria-label="Unassigned branch">Unassigned</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <a 
        href={`mailto:${row.original.email}`}
        className="text-primary hover:underline"
        aria-label={`Email ${row.original.email}`}
      >
        {row.original.email}
      </a>
    ),
  },
  {
    accessorKey: 'roles',
    header: 'Role',
    cell: ({ row }) => {
      const roles = row.original.roles;
      
      if (!roles || roles.length === 0) {
        return <Badge variant="outline" className="text-muted-foreground">No Role</Badge>;
      }
      
      return (
        <div className="flex flex-wrap gap-1">
          {roles.slice(0, 2).map((role, index) => (
            <Badge key={index} variant="outline" aria-label={`Role: ${role}`}>
              {role}
            </Badge>
          ))}
          {roles.length > 2 && (
            <Badge variant="outline" className="text-muted-foreground">
              +{roles.length - 2} more
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="text-right text-sm text-muted-foreground">
        Click to edit
      </div>
    ),
  },
];