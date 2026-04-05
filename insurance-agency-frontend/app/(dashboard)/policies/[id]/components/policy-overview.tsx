// app/(dashboard)/policies/[id]/components/policy-overview.tsx

'use client';

import React from 'react';
import { Policy } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import {
  FileText, DollarSign, Calendar, Car, CreditCard, Info
} from 'lucide-react';

interface PolicyOverviewProps {
  policy: Policy;
}

// A reusable component for displaying a single piece of information
const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) => {
  if (!value && !children) return null;
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="font-medium text-base">{value || children}</div>
    </div>
  );
};

// Helper to format currency consistently
const formatCurrency = (amount: string | number | null) => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(amount));
};

// Helper to format dates consistently
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'PPP p'); // e.g., Jun 2, 2024, 12:00:00 AM
};

export function PolicyOverview({ policy }: PolicyOverviewProps) {
  const isRecurring = policy.policy_type_detail?.payment_structure === 'RECURRING_FEE';

  return (
    <div className="space-y-6">
      {/* Financial Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3"><DollarSign className="h-5 w-5" />Financials</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <DetailItem label={isRecurring ? "Recurring Fee" : "Total Premium"} value={formatCurrency(policy.premium_amount)} />
          <DetailItem label="Sum Insured" value={formatCurrency(policy.sum_insured)} />
          <DetailItem label="Deductible / Excess" value={formatCurrency(policy.deductible)} />
          <DetailItem label="Amount Paid">
            <span className="font-medium text-base text-green-600">{formatCurrency(policy.amount_paid)}</span>
          </DetailItem>
          <DetailItem label="Balance Due">
            <span className="font-medium text-base text-red-600">{formatCurrency(policy.balance_due)}</span>
          </DetailItem>
        </CardContent>
      </Card>

      {/* Policy Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3"><FileText className="h-5 w-5" />Core Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <DetailItem label="Policy Type" value={policy.policy_type_detail.name} />
          <DetailItem label="Payment Structure" value={policy.policy_type_detail.payment_structure.replace('_', ' ')} />
          <DetailItem label="Payment Type">
            <div className="flex items-center gap-2 font-medium">
              <CreditCard className="h-4 w-4" />
              {policy.is_installment ? 'Installment Plan' : (isRecurring ? 'Recurring' : 'Full Payment')}
            </div>
          </DetailItem>
          {policy.vehicle_registration_number && (
            <DetailItem label="Vehicle Registration">
              <div className="flex items-center gap-2 font-mono">
                <Car className="h-4 w-4" />
                {policy.vehicle_registration_number}
              </div>
            </DetailItem>
          )}
          <DetailItem label="Insurance Certificate #" value={policy.insurance_certificate_number || 'N/A'} />
        </CardContent>
      </Card>

      {/* Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3"><Calendar className="h-5 w-5" />Timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <DetailItem label="Policy Start Date" value={formatDate(policy.policy_start_date)} />
          <DetailItem label="Policy End Date" value={formatDate(policy.policy_end_date)} />
          {isRecurring && <DetailItem label="Next Payment Due" value={formatDate(policy.next_due_date)} />}
          <DetailItem label="Date Created" value={formatDate(policy.created_at)} />
          <DetailItem label="Last Updated" value={formatDate(policy.updated_at)} />
        </CardContent>
      </Card>

      {/* Additional Details Card */}
      {policy.additional_details && Object.keys(policy.additional_details).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Info className="h-5 w-5" />
              Additional Details
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">

            {Object.entries(policy.additional_details).map(([key, value]) => {
              const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

              // ARRAY HANDLING (like dependents)
              if (Array.isArray(value)) {
                return (
                  <div key={key} className="space-y-2">
                    <p className="font-semibold text-muted-foreground">{label}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {value.map((item, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-secondary/40">
                          {Object.entries(item).map(([subKey, subValue]) => (
                            <div key={subKey} className="mb-1">
                              <span className="font-medium capitalize text-muted-foreground">
                                {subKey.replace(/_/g, " ")}:
                              </span>{" "}
                              <span>{String(subValue)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // OBJECT HANDLING (rare but supported)
              if (typeof value === "object" && value !== null) {
                return (
                  <div key={key} className="p-3 border rounded-lg bg-secondary/40">
                    <p className="font-semibold text-muted-foreground mb-2">{label}</p>
                    {Object.entries(value).map(([subKey, subValue]) => (
                      <div key={subKey} className="mb-1">
                        <span className="font-medium capitalize text-muted-foreground">
                          {subKey.replace(/_/g, " ")}:
                        </span>{" "}
                        <span>{String(subValue)}</span>
                      </div>
                    ))}
                  </div>
                );
              }

              // SIMPLE FIELD
              return (
                <div key={key} className="flex justify-between border-b pb-2">
                  <p className="font-medium text-muted-foreground">{label}</p>
                  <p>{String(value)}</p>
                </div>
              );
            })}

          </CardContent>
        </Card>
      )}
    </div>
  );
}