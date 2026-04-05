'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Users, FileText, Briefcase, HandCoins, Building, Settings,
  ShieldCheck, UserCog, BarChart2, LucideIcon, DollarSign, ChevronDown,
  TrendingUp, AlertCircle, UserCheck
} from 'lucide-react';
import { cn, getUserRoles, Role } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  submenu?: SubNavItem[];
};

type SubNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['Agent', 'Branch Manager', 'Agency Admin'] },
  { href: '/customers', label: 'Customers', icon: Users, roles: ['Agent', 'Branch Manager', 'Agency Admin'] },
  { href: '/policies', label: 'Policies', icon: FileText, roles: ['Agent', 'Branch Manager', 'Agency Admin'] },
  { href: '/leads', label: 'Leads', icon: Briefcase, roles: ['Agent', 'Branch Manager', 'Agency Admin'] },
  { href: '/claims', label: 'Claims', icon: ShieldCheck, roles: ['Branch Manager', 'Agency Admin'] },
  { href: '/commissions', label: 'Commissions', icon: HandCoins, roles: ['Agent', 'Branch Manager', 'Agency Admin', 'Superuser'] },
  { href: '/finances/expenses', label: 'Finances', icon: DollarSign, roles: ['Branch Manager', 'Agency Admin'] },
  {
    href: '/reports',
    label: 'Reports',
    icon: BarChart2,
    roles: ['Branch Manager', 'Agency Admin'],
    submenu: [
      { href: '/reports/pnl', label: 'P&L Report', icon: TrendingUp },
      { href: '/reports/revenue', label: 'Revenue Breakdown', icon: FileText },
      { href: '/reports/commissions', label: 'Commissions', icon: HandCoins },
      { href: '/reports/sales', label: 'Sales Summary', icon: BarChart2 },
      { href: '/reports/policies', label: 'Policies', icon: FileText },
      { href: '/reports/customers', label: 'Customers', icon: Users },
      { href: '/reports/claims', label: 'Claims', icon: AlertCircle },
    ]
  },
  {
    href: '/admin_contr/system',
    label: 'System',
    icon: Settings,
    roles: ['Agency Admin', 'Branch Manager', 'Superuser'],
    submenu: [
      { href: '/admin_contr/system/kyc', label: 'KYC Management', icon: UserCheck, roles: ['Agency Admin', 'Branch Manager', 'Superuser'] },
      { href: '/admin_contr/system/communications', label: 'Communication Hub', icon: Settings, roles: ['Agency Admin', 'Superuser'] }, // Use Settings icon or MessageSquare if preferred
      { href: '/admin_contr/system/audit-logs', label: 'Audit Logs', icon: ShieldCheck, roles: ['Agency Admin'] },
      { href: '/admin_contr/users', label: 'Staff Management', icon: UserCog, roles: ['Agency Admin'] },
      { href: '/admin_contr/agency', label: 'Agency Settings', icon: Building, roles: ['Agency Admin'] },
    ]
  },
];

// This is now a shared component for nav links
export function NavLinks({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRoles = getUserRoles(user);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/reports', '/admin_contr /system']);

  const visibleNavItems = ALL_NAV_ITEMS.filter(item =>
    item.roles.some(r => userRoles.includes(r))
  );

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev: string[]) =>
      prev.includes(href) ? prev.filter((h: string) => h !== href) : [...prev, href]
    );
  };

  return (
    <>
      {visibleNavItems.map(item => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));

        const Icon = item.icon;
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const isExpanded = expandedMenus.includes(item.href);

        return (
          <div key={item.href}>
            {hasSubmenu ? (
              <button
                onClick={() => toggleMenu(item.href)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors w-full',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </button>
            ) : (
              <Link
                href={item.href}
                onClick={onLinkClick}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )}

            {hasSubmenu && isExpanded && (
              <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-3">
                {item.submenu!
                  .filter(subItem => !subItem.roles || subItem.roles.some(r => userRoles.includes(r)))
                  .map(subItem => {
                    const SubIcon = subItem.icon;
                    const isSubActive = pathname === subItem.href;

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={onLinkClick}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                          isSubActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <SubIcon className="h-3.5 w-3.5" />
                        <span>{subItem.label}</span>
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// This is now ONLY the desktop sidebar.
export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-shrink-0 bg-gray-900 text-gray-300 lg:flex lg:flex-col dark">
      <div className="h-16 flex items-center justify-center text-2xl font-semibold text-white tracking-wider border-b border-gray-800">
        InsuraDesk
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <NavLinks />
      </nav>

      <div className="px-6 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} InsuraDesk.
        </p>
      </div>
    </aside>
  );
}