'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { Home, Users, FileText, ShieldCheck, Briefcase, BarChart3, DollarSign, History, Building } from 'lucide-react';
// Define navigation links based on roles
const navLinks: Record<User['roles'][number], { name: string; href: string; icon: React.ElementType }[]> = {
  Agent: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Leads', href: '/leads', icon: BarChart3 },
    { name: 'Policies', href: '/policies', icon: FileText },
    { name: 'My Commissions', href: '/commissions', icon: DollarSign },
  ],
  'Branch Manager': [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Leads', href: '/leads', icon: BarChart3 },
    { name: 'Claims', href: '/claims', icon: ShieldCheck },
    { name: 'Policies', href: '/policies', icon: FileText },
    { name: 'Commissions', href: '/commissions', icon: DollarSign },
    { name: 'KYC Review', href: '/kyc-review', icon: ShieldCheck }
  ],
  'Agency Admin': [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'My Agency', href: '/agency', icon: Building }, 
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Policies', href: '/policies', icon: FileText },
    { name: 'Claims', href: '/claims', icon: ShieldCheck },
    { name: 'Settings', href: '/settings/users', icon: Briefcase },
    { name: 'Audit Logs', href: '/audit-logs', icon: History },
    { name: 'KYC Review', href: '/kyc-review', icon: ShieldCheck }
  ],
  Superuser: [
    { name: 'System Dashboard', href: '/dashboard', icon: Home },
    { name: 'Agencies', href: '/agency', icon: Briefcase },
    { name: 'Audit Logs', href: '/audit-logs', icon: History },
  ],
};

// Pick the highest-priority role when multiple are assigned
const getPrimaryRole = (roles: User['roles']): User['roles'][number] => {
  if (roles.includes('Superuser')) return 'Superuser';
  if (roles.includes('Agency Admin')) return 'Agency Admin';
  if (roles.includes('Branch Manager')) return 'Branch Manager';
  return 'Agent';
};

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const primaryRole = getPrimaryRole(user?.roles || []);
  const links = navLinks[primaryRole] || [];

  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 flex-col bg-white border-r dark:bg-gray-900 dark:border-gray-800">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-16 flex items-center justify-center border-b dark:border-gray-800">
          <h1 className="text-xl font-bold">Agency CRM</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                {
                  'bg-gray-200 font-semibold text-gray-900 dark:bg-gray-700 dark:text-white':
                    pathname.startsWith(link.href),
                }
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
