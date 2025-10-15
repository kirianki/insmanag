'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// **FIX:** Import sensors from dnd-kit
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import api from '../../../lib/api';
import { Lead, LeadStatus } from '../../../types';
import { useAuth } from '../../../hooks/use-auth';
import { KanbanColumn } from '../../../components/features/leads/kanban-column';
import { LeadCard } from '../../../components/features/leads/lead-card';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { LeadForm } from '../../../components/features/leads/lead-form';
import { LeadFormValues } from '../../../components/features/leads/lead-form-schema';

const KANBAN_COLUMNS: { id: LeadStatus; title: string }[] = [
  { id: 'NEW', title: 'New' },
  { id: 'CONTACTED', title: 'Contacted' },
  { id: 'QUALIFIED', title: 'Qualified' },
  { id: 'PROPOSAL_SENT', title: 'Proposal Sent' },
  { id: 'LOST', title: 'Lost' },
];

// API Functions
const fetchLeads = async (): Promise<{ results: Lead[] }> => {
  const { data } = await api.get('/leads/');
  return data;
};
const createLead = (leadData: LeadFormValues & { assigned_agent: string }) => api.post('/leads/', leadData);
const updateLead = (data: { id: string; status?: LeadStatus } & Partial<LeadFormValues>) => api.patch(`/leads/${data.id}/`, data);
const convertLeadToCustomer = (leadId: string) => api.post(`/leads/${leadId}/convert/`, {});

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  });

  const mutation = useMutation({
    mutationFn: updateLead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
    onError: (error) => alert(`Failed to update lead: ${error.message}`),
  });

  const createMutation = useMutation({
    mutationFn: (leadData: LeadFormValues & { assigned_agent: string }) => createLead(leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsDialogOpen(false);
      setEditingLead(null);
    },
    onError: (error) => alert(`Failed to create lead: ${error.message}`),
  });

  const convertMutation = useMutation({
    mutationFn: convertLeadToCustomer,
    onSuccess: () => {
      alert('Lead successfully converted to customer!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error) => alert(`Failed to convert lead: ${error.message}`),
  });

  const leadsByColumn = useMemo(() => {
    const columns = new Map<LeadStatus, Lead[]>();
    KANBAN_COLUMNS.forEach(col => columns.set(col.id, []));
    leadsData?.results.forEach(lead => {
      if (lead.status !== 'CONVERTED') {
        columns.get(lead.status)?.push(lead);
      }
    });
    return columns;
  }, [leadsData]);

  // **FIX:** Define sensors to distinguish between clicks and drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // User must drag at least 8 pixels before a drag is initiated
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.lead) setActiveLead(event.active.data.current.lead);
  }

  function handleDragOver(event: DragEndEvent) {
    const { over } = event;
    setOverColumnId(over ? over.id as string : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    setOverColumnId(null);
    if (over && active.id !== over.id) {
      const originalStatus = active.data.current?.lead.status as LeadStatus;
      const newStatus = over.id as LeadStatus;
      if (originalStatus !== newStatus) {
        mutation.mutate({ id: active.id as string, status: newStatus });
      }
    }
  }

  function handleOpenDialog(lead: Lead | null) {
    setEditingLead(lead);
    setIsDialogOpen(true);
  }

  function handleSubmit(values: LeadFormValues) {
    if (editingLead) {
      mutation.mutate({ ...values, id: editingLead.id });
    } else {
      if (user?.id) {
        createMutation.mutate({ ...values, assigned_agent: user.id });
      } else {
        alert("Error: Could not identify the logged-in user.");
      }
    }
    setIsDialogOpen(false);
    setEditingLead(null);
  }

  if (isLoading) return <div>Loading leads...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leads Pipeline</h1>
        <Button onClick={() => handleOpenDialog(null)}>Add Lead</Button>
      </div>
      <div className="flex-grow overflow-x-auto">
        {/* **FIX:** Pass the sensors to the DndContext */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
          <div className="flex gap-6 h-full">
            {KANBAN_COLUMNS.map(column => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                leads={leadsByColumn.get(column.id) || []}
                onClickCard={handleOpenDialog}
                onConvertCard={convertMutation.mutate}
                isOver={overColumnId === column.id}
              />
            ))}
          </div>
          <DragOverlay>{activeLead ? <LeadCard lead={activeLead} /> : null}</DragOverlay>
        </DndContext>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) setEditingLead(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
            <DialogDescription>
              {editingLead ? 'Update the details for this lead.' : 'Enter the details for the new lead.'}
            </DialogDescription>
          </DialogHeader>
          <LeadForm
            onSubmit={handleSubmit}
            isPending={mutation.isPending || createMutation.isPending}
            defaultValues={editingLead || undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}