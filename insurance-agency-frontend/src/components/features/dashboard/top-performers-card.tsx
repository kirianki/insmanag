// components/features/dashboard/top-performers-card.tsx
'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { TopPerformer } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

interface TopPerformersCardProps {
  agents: TopPerformer[];
}

export function TopPerformersCard({ agents }: TopPerformersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Performers
        </CardTitle>
        <CardDescription>Ranked by total premium</CardDescription>
      </CardHeader>
      <CardContent>
        {agents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Policies</TableHead>
                <TableHead className="text-right">Premium</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent, idx) => (
                <TableRow key={agent.agent_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {idx < 3 && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                      )}
                      <span className="font-medium">{agent.agent_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{agent.policies_sold}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(agent.total_premium)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No performance data available</p>
        )}
      </CardContent>
    </Card>
  );
}