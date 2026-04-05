'use client';

import { PolicyInstallment } from '@/types/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard } from 'lucide-react';
import { useState } from 'react';
import { RecordInstallmentPaymentDialog } from './record-installment-payment-dialog';

interface InstallmentsSectionProps {
  policyId: string;
  installments: PolicyInstallment[];
  isLoading: boolean;
  userRoles: string[];
}



export function InstallmentsSection({ policyId, installments, isLoading, userRoles }: InstallmentsSectionProps) {


  const isAgencyAdmin = userRoles.includes('Agency Admin');

  const [selectedInstallment, setSelectedInstallment] = useState<PolicyInstallment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRecordPayment = (installment: PolicyInstallment) => {
    setSelectedInstallment(installment);
    setIsDialogOpen(true);
  };

  const getStatusVariant = (status: string) => {
    if (status === 'PAID') return 'default';
    if (status === 'OVERDUTooltip') return 'destructive';
    return 'secondary';
  }

  return (
    <Card>
      <CardHeader>
        {/* --- THE FIX IS ON THIS LINE --- */}
        <CardTitle className="flex items-center gap-3">
          <CreditCard className="h-5 w-5" /> Installment Plan
        </CardTitle>
        {/* The closing tag was </Title>, it is now correctly </CardTitle> */}
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount (KES)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid On</TableHead>
                <TableHead>Ref #</TableHead>
                {isAgencyAdmin && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    {isAgencyAdmin && <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : installments.length > 0 ? (
                installments.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell>{new Date(inst.due_date!).toLocaleDateString()}</TableCell>
                    <TableCell>{Number(inst.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(inst.status!)}>{inst.status_display}</Badge></TableCell>
                    <TableCell>{inst.paid_on ? new Date(inst.paid_on).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs">{inst.transaction_reference || '-'}</TableCell>
                    {isAgencyAdmin && (
                      <TableCell className="text-right">
                        {inst.status !== 'PAID' && (
                          <Button size="sm" onClick={() => handleRecordPayment(inst)}>
                            Record Payment
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAgencyAdmin ? 6 : 5} className="text-center text-muted-foreground">
                    No installments found for this policy.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <RecordInstallmentPaymentDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        policyId={policyId}
        installment={selectedInstallment}
      />
    </Card>
  );
}