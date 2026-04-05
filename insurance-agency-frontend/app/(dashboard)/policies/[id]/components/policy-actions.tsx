// app/(dashboard)/policies/[id]/components/policy-actions.tsx

'use client';

import React from 'react';
import { Policy } from '@/types/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, PlayCircle, XCircle, MoreHorizontal } from 'lucide-react';

interface PolicyActionsProps {
  policy: Policy;
  onEdit: () => void;
  onActivate: () => void;
  onCancel: () => void;
}

export function PolicyActions({ policy, onEdit, onActivate, onCancel }: PolicyActionsProps) {
  const canEdit = policy.status === 'AWAITING_PAYMENT' ||
                  policy.status === 'PAID_PENDING_ACTIVATION';

  const canActivate = policy.status === 'PAID_PENDING_ACTIVATION';
  const canCancel = policy.status !== 'CANCELLED' &&
                   policy.status !== 'EXPIRED';

  return (
    <div className="flex items-center gap-2">
      {/* Primary Actions */}
      {canActivate && (
        <Button onClick={onActivate} className="flex items-center gap-2">
          <PlayCircle className="h-4 w-4" />
          Activate Policy
        </Button>
      )}

      {canEdit && (
        <Button variant="outline" onClick={onEdit} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      )}

      {/* Dropdown for additional actions */}
      {canCancel && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuItem
              onClick={onCancel}
              className="text-destructive focus:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Policy
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}