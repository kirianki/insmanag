'use client';

import { InsuranceProvider } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface ProviderHeaderProps {
  provider?: InsuranceProvider;
  isLoading: boolean;
  onEdit: () => void;
}

export function ProviderHeader({ provider, isLoading, onEdit }: ProviderHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex justify-between items-start">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{provider?.name}</h1>
        <p className="text-sm text-muted-foreground">Provider ID: {provider?.id}</p>
      </div>
      <Button onClick={onEdit}><Edit className="mr-2 h-4 w-4" /> Edit Details</Button>
    </div>
  );
}