'use client'; 

import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-full md:w-[300px]" />
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[120px]" />
      </div>
      <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-7">
        <div className="xl:col-span-4 space-y-6">
            <Skeleton className="h-[350px]" />
            <Skeleton className="h-[300px]" />
        </div>
        <div className="xl:col-span-3 space-y-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
        </div>
      </div>
    </div>
  );
}