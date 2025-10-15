// components/features/dashboard/expiring-policies-card.tsx
'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { ExpiringPolicy } from '../../../types';
import { formatDate } from '../../../lib/utils';

interface ExpiringPoliciesCardProps {
  policies: ExpiringPolicy[];
}

export function ExpiringPoliciesCard({ policies }: ExpiringPoliciesCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Expiring Soon
        </CardTitle>
        <CardDescription>Policies requiring renewal in 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {policies.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Policy #</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map(p => (
                <TableRow 
                  key={p.policy_id} 
                  onClick={() => router.push(`/policies/${p.policy_id}`)} 
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{p.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.policy_number}</TableCell>
                  <TableCell>{formatDate(p.expiry_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No policies expiring soon</p>
        )}
      </CardContent>
    </Card>
  );
}