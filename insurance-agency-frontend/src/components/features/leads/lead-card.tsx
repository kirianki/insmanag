'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '../../../components/ui/card';
import { Lead } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { MoreHorizontal, CheckCircle } from 'lucide-react';
import React from 'react';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onConvert?: (leadId: string) => void;
}

export function LeadCard({ lead, onClick, onConvert }: LeadCardProps) {
  const {
    attributes,
    listeners, // These are the event handlers for dragging
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleConvertClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    if (onConvert) {
      onConvert(lead.id);
    }
  };

  const canBeConverted = lead.status === 'QUALIFIED' || lead.status === 'PROPOSAL_SENT';

  return (
    // The ref and style are applied to the outer div for positioning
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        onClick={onClick}
        className="mb-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <CardContent className="p-4 text-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="font-semibold text-gray-900">{lead.first_name} {lead.last_name}</p>
            {/* **THE FIX:** The `listeners` are ONLY applied to the drag handle icon. */}
            <div {...listeners} className="cursor-grab text-gray-400 hover:text-gray-700 p-1 -mr-1 -mt-1">
              <MoreHorizontal size={18} />
            </div>
          </div>
          <div className="text-gray-600">
            <p>{lead.email}</p>
            <p>{lead.phone}</p>
          </div>
          {lead.source && (
            <Badge variant="outline" className="font-normal bg-gray-100">
              {lead.source.replace('_', ' ')}
            </Badge>
          )}
          {canBeConverted && onConvert && (
            <div className="pt-2">
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleConvertClick}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Convert to Customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}