// components/features/dashboard/recent-activity-card.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { RecentClaim, RecentPolicy } from '../../../types';
import { formatCurrency, formatDate } from '../../../lib/utils';

interface RecentActivityCardProps {
  policies: RecentPolicy[];
  claims: RecentClaim[];
}

export function RecentActivityCard({ policies, claims }: RecentActivityCardProps) {
  const router = useRouter();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest policies and claims</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Policies Sold</h3>
          {policies.length > 0 ? (
            <div className="space-y-2">
              {policies.map(p => (
                <div 
                  key={p.policy_id} 
                  onClick={() => router.push(`/policies/${p.policy_id}`)} 
                  className="flex justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{p.customer_name}</p>
                    <p className="text-xs text-muted-foreground">#{p.policy_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(p.premium)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent policies</p>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Claims Filed</h3>
          {claims.length > 0 ? (
            <div className="space-y-2">
              {claims.map(c => (
                <div 
                  key={c.claim_id} 
                  onClick={() => router.push(`/claims/${c.claim_id}`)} 
                  className="flex justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{c.customer_name}</p>
                    <p className="text-xs text-muted-foreground">#{c.claim_number}</p>
                  </div>
                  <p className="text-xs text-muted-foreground self-center">{formatDate(c.date)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent claims</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}