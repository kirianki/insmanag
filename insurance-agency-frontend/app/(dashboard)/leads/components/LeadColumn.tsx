'use client';

import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Lead } from '@/types/api';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';

interface LeadColumnProps {
  id: string;
  title: string;
  color?: string;
  leads: Lead[];
  onConvert: (leadId: string) => void;
  isConverting?: boolean;
}

export function LeadColumn({ id, title, color, leads, onConvert, isConverting }: LeadColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Deduplicate leads to prevent React key errors
  const uniqueLeads = React.useMemo(() => {
    const seen = new Set<string>();
    return leads.filter(lead => {
      if (seen.has(lead.id)) {
        console.warn(`Duplicate lead ${lead.id} filtered from ${title} column`);
        return false;
      }
      seen.add(lead.id);
      return true;
    });
  }, [leads, title]);

  return (
    <div 
      className={cn(
        "flex flex-col w-full sm:w-80 flex-shrink-0 rounded-lg p-3 transition-all duration-200",
        color || "bg-gray-100 dark:bg-gray-900",
        isOver && "ring-2 ring-primary ring-offset-2 scale-105"
      )}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-3">
        <h3 className="font-semibold text-lg">{title}</h3>
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        )}>
          {uniqueLeads.length}
        </span>
      </div>
      
      <div 
        ref={setNodeRef} 
        className={cn(
          "flex-1 overflow-y-auto p-1 rounded-md transition-colors",
          "min-h-[400px]",
          isOver && "bg-primary/5"
        )}
      >
        {uniqueLeads.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed rounded-md">
            Drop leads here
          </div>
        ) : (
          <SortableContext items={uniqueLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
            {uniqueLeads.map(lead => (
              <LeadCard 
                key={lead.id} 
                lead={lead} 
                onConvert={onConvert}
                isConverting={isConverting}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}