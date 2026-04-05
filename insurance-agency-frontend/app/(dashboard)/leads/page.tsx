'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeads, updateLead, convertLeadToCustomer } from '@/services/crmService';
import { Lead, LeadStatus } from '@/types/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { DndContext, DragEndEvent, closestCorners, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateLeadForm } from './components/CreateLeadForm';
import { LeadColumn } from './components/LeadColumn';
import { useToast } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface ApiError {
  response?: {
    data?: {
      message?: string;
      detail?: string;
    };
  };
  message?: string;
}

interface MutationContext {
  previousColumns?: LeadColumns;
}

const leadColumnConfig: { id: LeadStatus; title: string; color: string }[] = [
  { id: 'NEW', title: 'New', color: 'bg-blue-100 dark:bg-blue-950' },
  { id: 'CONTACTED', title: 'Contacted', color: 'bg-purple-100 dark:bg-purple-950' },
  { id: 'QUALIFIED', title: 'Qualified', color: 'bg-yellow-100 dark:bg-yellow-950' },
  { id: 'PROPOSAL_SENT', title: 'Proposal Sent', color: 'bg-orange-100 dark:bg-orange-950' },
  { id: 'LOST', title: 'Lost', color: 'bg-red-100 dark:bg-red-950' },
];

const initialColumns: Record<LeadStatus, Lead[]> = {
  NEW: [], CONTACTED: [], QUALIFIED: [], PROPOSAL_SENT: [], LOST: [], CONVERTED: []
};

type LeadColumns = typeof initialColumns;

export default function LeadsPage() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [columns, setColumns] = useState<LeadColumns>(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const { data: leadData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads().then(res => res.data),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000,
  });

  useEffect(() => {
    if (leadData?.results) {
      try {
        const newColumns: LeadColumns = {
          NEW: [],
          CONTACTED: [],
          QUALIFIED: [],
          PROPOSAL_SENT: [],
          LOST: [],
          CONVERTED: []
        };
        
        const seenIds = new Set<string>();
        
        for (const lead of leadData.results) {
          if (seenIds.has(lead.id)) {
            console.warn(`Duplicate lead ID detected: ${lead.id}`);
            continue;
          }
          
          seenIds.add(lead.id);
          const status = lead.status || 'NEW';
          
          if (newColumns[status]) {
            newColumns[status].push(lead);
          } else {
            console.warn(`Unknown lead status: ${status} for lead ${lead.id}`);
            newColumns.NEW.push({ ...lead, status: 'NEW' });
          }
        }
        
        setColumns(prevColumns => {
          const prevString = JSON.stringify(prevColumns);
          const newString = JSON.stringify(newColumns);
          return prevString !== newString ? newColumns : prevColumns;
        });
        
      } catch (err) {
        console.error('Error processing lead data:', err);
        toast.error('Data Processing Error', { 
          description: 'Some leads may not be displayed correctly.' 
        });
      }
    }
  }, [leadData, toast]);

  const updateLeadMutation = useMutation<unknown, ApiError, { id: string, status: LeadStatus }, MutationContext>({
    mutationFn: ({ id, status }: { id: string, status: LeadStatus }) => {
      if (!id || !status) {
        throw new Error('Invalid lead ID or status');
      }
      return updateLead(id, { status });
    },
    onSuccess: (_, variables) => {
      toast.success("Lead Updated", { 
        description: `Successfully moved to ${variables.status.replace('_', ' ').toLowerCase()}` 
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: ApiError, variables, context) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update lead';
      toast.error("Update Failed", { description: errorMessage });
      
      if (context?.previousColumns) {
        setColumns(context.previousColumns);
      }
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const previousColumns = JSON.parse(JSON.stringify(columns)) as LeadColumns;

      setColumns(prev => {
        const newCols = JSON.parse(JSON.stringify(prev)) as LeadColumns;
        let draggedLead: Lead | undefined;

        for (const key in newCols) {
          const statusKey = key as LeadStatus;
          const leadIndex = newCols[statusKey].findIndex((l: Lead) => l.id === id);
          if (leadIndex !== -1) {
            [draggedLead] = newCols[statusKey].splice(leadIndex, 1);
            break;
          }
        }

        if (draggedLead) {
          draggedLead.status = status;
          
          const existsInTarget = newCols[status].some((l: Lead) => l.id === id);
          
          if (!existsInTarget) {
            newCols[status].push(draggedLead);
          } else {
            console.warn(`Lead ${id} already exists in ${status}, skipping duplicate`);
          }
        } else {
          console.error(`Lead ${id} not found during optimistic update`);
        }
        
        return newCols;
      });

      return { previousColumns };
    },
  });

  const convertLeadMutation = useMutation<unknown, ApiError, string>({
    mutationFn: async (leadId: string) => {
      if (!leadId) {
        throw new Error('Invalid lead ID');
      }
      return convertLeadToCustomer(leadId);
    },
    onSuccess: (_data, leadId) => {
      toast.success("Lead Converted!", { 
        description: "Successfully converted to customer. Redirecting..." 
      });
      
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      setColumns(prev => {
        const newCols = JSON.parse(JSON.stringify(prev)) as LeadColumns;
        for (const key in newCols) {
          const statusKey = key as LeadStatus;
          newCols[statusKey] = newCols[statusKey].filter((l: Lead) => l.id !== leadId);
        }
        return newCols;
      });
      
      setTimeout(() => router.push('/customers'), 1500);
    },
    onError: (error: ApiError) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to convert lead';
      toast.error("Conversion Failed", { description: errorMessage });
    },
  });

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    try {
      const leadId = String(active.id);
      const newStatus = over.id as LeadStatus;
      const lead = active.data.current?.lead as Lead;
      const oldStatus = lead?.status || 'NEW';

      if (newStatus !== oldStatus) {
        if (!leadColumnConfig.find(col => col.id === newStatus)) {
          toast.error("Invalid Status", { description: "Cannot move lead to this column" });
          return;
        }
        updateLeadMutation.mutate({ id: leadId, status: newStatus });
      }
    } catch (err) {
      console.error('Error handling drag end:', err);
      toast.error("Drag Error", { description: "Failed to update lead position" });
    }
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Refreshed", { description: "Leads data updated" });
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Loading leads pipeline...</p>
        <p className="text-sm text-muted-foreground">Please wait</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error Loading Leads</AlertTitle>
          <AlertDescription className="mt-2">
            {error instanceof Error ? error.message : 'Failed to load leads data. Please try again.'}
          </AlertDescription>
        </Alert>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => refetch()} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const totalLeads = Object.values(columns).flat().length;
  if (totalLeads === 0 && !isLoading) {
    return (
      <div className="h-full flex flex-col">
        <PageHeader 
          title="Leads Pipeline"
          actionButtonText="Add Lead"
          onActionButtonClick={() => setCreateOpen(true)}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h3 className="text-2xl font-semibold mb-2">No Leads Yet</h3>
            <p className="text-muted-foreground mb-6">
              Get started by adding your first lead to the pipeline
            </p>
            <Button onClick={() => setCreateOpen(true)} size="lg">
              Add Your First Lead
            </Button>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
            </DialogHeader>
            <CreateLeadForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const activeLead = activeId ? 
    Object.values(columns).flat().find(l => l.id === activeId) : null;

  return (
    <div className="h-full flex flex-col">
      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Leads Pipeline"
            actionButtonText="Add Lead"
            onActionButtonClick={() => setCreateOpen(true)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mr-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
          </DialogHeader>
          <CreateLeadForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <DndContext 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        collisionDetection={closestCorners}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 px-1">
          {leadColumnConfig.map(col => (
            <LeadColumn 
              key={col.id} 
              id={col.id} 
              title={col.title} 
              color={col.color}
              leads={columns[col.id] || []}
              onConvert={(leadId) => convertLeadMutation.mutate(leadId)}
              isConverting={convertLeadMutation.isPending}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <div className="opacity-80 rotate-3 cursor-grabbing">
              <div className="bg-white dark:bg-gray-800 border-2 border-primary rounded-lg shadow-xl p-4">
                <p className="font-semibold">{activeLead.first_name} {activeLead.last_name}</p>
                <p className="text-sm text-muted-foreground">{activeLead.phone}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}