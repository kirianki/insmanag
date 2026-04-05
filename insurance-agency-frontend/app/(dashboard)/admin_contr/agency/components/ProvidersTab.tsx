'use client';

import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getInsuranceProviders } from '@/services/utilityService';
import { InsuranceProviderList, PaginatedInsuranceProviderList } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { ArrowUpRight, AlertCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ProvidersTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<string>('all');

  const { data, isLoading, isError, error } = useQuery<PaginatedInsuranceProviderList, Error>({
    queryKey: ['providers', page, search, isActive],
    queryFn: () => getInsuranceProviders({
      page,
      search,
      is_active: isActive === 'all' ? undefined : isActive === 'active'
    }).then(res => res.data),
    placeholderData: keepPreviousData,
  });

  const columns: ColumnDef<InsuranceProviderList>[] = [
    {
      accessorKey: "name",
      header: "Provider Name",
    },
    {
      accessorKey: "short_name",
      header: "Short Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: { row: { original: InsuranceProviderList } }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: { original: InsuranceProviderList } }) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin_contr/providers/${row.original.id}`}>
            View Details <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insurance Providers</CardTitle>
          <CardDescription>View and manage the insurance companies your agency works with.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load insurance providers. {error instanceof Error ? error.message : 'Please try again.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Insurance Providers</CardTitle>
            <CardDescription>
              View and manage the insurance companies your agency works with.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin_contr/providers/new">Add New Provider</Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={isActive}
              onValueChange={(v: string) => { setIsActive(v); setPage(1); }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={data?.results || []}
          isLoading={isLoading}
        />

        {/* Pagination Controls */}
        {data && (data.previous || data.next) && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing page {page} with {data.results.length} of {data.count} providers
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={!data.previous}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data.next}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}