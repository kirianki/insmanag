'use client';

import { SortableContext } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Lead } from '../../../types';
import { LeadCard } from './lead-card';
import React from 'react';
import { cn } from '../../../lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
  onClickCard: (lead: Lead) => void;
  onConvertCard: (leadId: string) => void;
  isOver?: boolean;
}

export function KanbanColumn({ id, title, leads, onClickCard, onConvertCard, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="w-80 flex-shrink-0">
      <div className={cn(
        "flex flex-col h-full bg-gray-100/60 rounded-xl transition-colors",
        { "bg-red-100/80": isOver && id === 'LOST' }
      )}>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </div>
        <div className="flex-grow p-4 pt-0 overflow-y-auto">
          <SortableContext items={leads.map(l => l.id)}>
            {leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onClickCard(lead)}
                onConvert={onConvertCard}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}