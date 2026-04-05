'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lead } from '@/types/api';
import { Mail, Phone, ArrowRightCircle, GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onConvert: (leadId: string) => void;
  isConverting?: boolean;
}

export function LeadCard({ lead, onConvert, isConverting }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isConvertible = lead.status === 'QUALIFIED' || lead.status === 'PROPOSAL_SENT';

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "mb-3 transition-all duration-200 hover:shadow-md",
        isDragging && "opacity-40 shadow-xl scale-105 rotate-2"
      )}
    >
      <div className="relative">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className={cn(
            "absolute left-2 top-2 p-1 rounded cursor-grab active:cursor-grabbing",
            "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          )}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <CardHeader className="p-4 pb-2 pl-10">
          <CardTitle className="text-base font-semibold">
            {lead.first_name} {lead.last_name}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 pt-2 space-y-2">
          {lead.email && (
            <div className="flex items-center text-xs text-muted-foreground group">
              <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
              <span className="truncate group-hover:text-foreground transition-colors">
                {lead.email}
              </span>
            </div>
          )}
          <div className="flex items-center text-xs text-muted-foreground group">
            <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
            <span className="group-hover:text-foreground transition-colors">
              {lead.phone}
            </span>
          </div>
          
          {/* Status Badge */}
          <div className="pt-1">
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
              "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}>
              {lead.status?.replace('_', ' ')}
            </span>
          </div>
        </CardContent>
      </div>
      
      {/* Convert Button */}
      {isConvertible && (
        <CardFooter className="p-2 pt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "w-full justify-start text-green-600 hover:text-green-700",
              "hover:bg-green-50 dark:hover:bg-green-950 transition-all",
              "font-medium"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onConvert(lead.id);
            }}
            disabled={isConverting}
          >
            {isConverting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ArrowRightCircle className="h-4 w-4 mr-2" />
                Convert to Customer
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}