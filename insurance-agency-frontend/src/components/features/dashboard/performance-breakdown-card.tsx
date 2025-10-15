// components/features/dashboard/performance-breakdown-card.tsx
'use client';

import { Briefcase, Users, GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { PerformanceItem } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

interface PerformanceBreakdownCardProps {
  data: {
    byPolicyType: PerformanceItem[];
    byProvider: PerformanceItem[];
    byBranch: PerformanceItem[];
  };
  isAgencyAdmin: boolean;
}

const BreakdownTable = ({ items }: { items: PerformanceItem[] }) => (
  <>
    {items.length > 0 ? (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Policies</TableHead>
            <TableHead className="text-right">Premium</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-muted-foreground">{item.policies_count}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(item.total_premium)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (
      <p className="text-sm text-muted-foreground text-center py-6">No data available</p>
    )}
  </>
);

export function PerformanceBreakdownCard({ data, isAgencyAdmin }: PerformanceBreakdownCardProps) {
  return (
    <Tabs defaultValue="policy-type" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:w-fit md:grid-cols-3">
        <TabsTrigger value="policy-type" className="gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Policy Type</span>
          <span className="sm:hidden">Type</span>
        </TabsTrigger>
        <TabsTrigger value="provider" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Provider</span>
          <span className="sm:hidden">Provider</span>
        </TabsTrigger>
        {isAgencyAdmin && (
          <TabsTrigger value="branch" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Branch</span>
            <span className="sm:hidden">Branch</span>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="policy-type">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Policy Type</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownTable items={data.byPolicyType} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="provider">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownTable items={data.byProvider} />
          </CardContent>
        </Card>
      </TabsContent>

      {isAgencyAdmin && (
        <TabsContent value="branch">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownTable items={data.byBranch} />
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}