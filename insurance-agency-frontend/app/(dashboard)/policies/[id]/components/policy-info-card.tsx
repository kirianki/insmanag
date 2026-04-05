// app/(dashboard)/policies/[id]/components/policy-info-card.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// --- MODIFIED: Import UserNested specifically ---
import { Policy, UserNested, InsuranceProviderList, PolicyType } from '@/types/api';
import Link from 'next/link';
import {
  User as UserIcon, Building, Briefcase, Hash, Calendar, Car, CreditCard, DollarSign, ShieldCheck, FileText
} from 'lucide-react';

interface PolicyInfoCardProps {
  title: string;
  policy?: Policy;
  customer?: { id: string; name: string; phone: string };
  provider?: InsuranceProviderList;
  // --- THIS IS THE FIX ---
  // The card only needs the nested user details, not the full User object.
  agent?: UserNested; 
  policyType?: PolicyType;
}

const InfoRow = ({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string | number | null, href?: string }) => {
  if (!value) return null; // Don't render a row if there's no value

  const content = <span className="font-medium text-right break-all">{value}</span>;

  return (
    <div className="flex items-start justify-between text-sm py-2 border-b last:border-b-0">
      <div className="flex items-center gap-3 text-muted-foreground whitespace-nowrap pr-4">
        {icon}
        <span>{label}</span>
      </div>
      {href ? (
        <Link href={href} className="text-primary hover:underline font-medium text-right break-all">
          {value}
        </Link>
      ) : content}
    </div>
  );
};

export function PolicyInfoCard({ title, policy, customer, provider, agent, policyType }: PolicyInfoCardProps) {
  let content;

  if (policy) {
    const isRecurring = policy.policy_type_detail?.payment_structure === 'RECURRING_FEE';
    content = (
      <>
        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Start Date" value={new Date(policy.policy_start_date!).toLocaleDateString()} />
        <InfoRow icon={<Calendar className="h-4 w-4" />} label="End Date" value={new Date(policy.policy_end_date!).toLocaleDateString()} />
        <InfoRow 
            icon={<DollarSign className="h-4 w-4" />} 
            label={isRecurring ? "Recurring Fee" : "Premium"} 
            value={`KES ${Number(policy.premium_amount).toLocaleString()}`} 
        />
        <InfoRow 
            icon={<ShieldCheck className="h-4 w-4" />} 
            label="Sum Insured" 
            value={policy.sum_insured ? `KES ${Number(policy.sum_insured).toLocaleString()}` : 'N/A'} 
        />
        <InfoRow 
            icon={<ShieldCheck className="h-4 w-4" />} 
            label="Deductible" 
            value={policy.deductible ? `KES ${Number(policy.deductible).toLocaleString()}` : 'N/A'} 
        />
        <InfoRow 
            icon={<CreditCard className="h-4 w-4" />} 
            label="Payment Type" 
            value={policy.is_installment ? 'Installment' : (isRecurring ? 'Recurring' : 'Full Payment')} 
        />
        <InfoRow 
            icon={<Car className="h-4 w-4" />} 
            label="Vehicle Reg." 
            value={policy.vehicle_registration_number} 
        />
        <InfoRow 
            icon={<ShieldCheck className="h-4 w-4" />} 
            label="Certificate #" 
            value={policy.insurance_certificate_number} 
        />
      </>
    );
  } else if (customer) {
    content = (
      <>
        <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Name" value={customer.name} href={`/customers/${customer.id}`} />
        <InfoRow icon={<Hash className="h-4 w-4" />} label="Phone" value={customer.phone} />
      </>
    );
  } else if (provider) {
    content = (
      <>
        <InfoRow icon={<Building className="h-4 w-4" />} label="Company" value={provider.name} />
        <InfoRow icon={<Building className="h-4 w-4" />} label="Email" value={provider.email} />
        <InfoRow icon={<Building className="h-4 w-4" />} label="Phone" value={provider.phone_number} />
      </>
    );
  } else if (agent) {
    content = (
      <>
        <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Name" value={`${agent.first_name || ''} ${agent.last_name || ''}`.trim()} />
        <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Email" value={agent.email} />
      </>
    );
  } else if (policyType) {
    content = (
      <>
        <InfoRow icon={<FileText className="h-4 w-4" />} label="Type Name" value={policyType.name} />
        <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Payment Structure" value={policyType.payment_structure.replace('_', ' ')} />
      </>
    );
  }

  const getIcon = () => {
    if (policy) return <FileText className="h-5 w-5" />;
    if (customer) return <UserIcon className="h-5 w-5" />;
    if (provider) return <Building className="h-5 w-5" />;
    if (agent) return <Briefcase className="h-5 w-5" />;
    if (policyType) return <FileText className="h-5 w-5" />;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base font-semibold">
          {getIcon()} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-2">
        {content}
      </CardContent>
    </Card>
  );
}