'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, User as UserIcon, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from './NotificationBell';
import { NavLinks } from './Sidebar'; // Import NavLinks from the updated Sidebar file
import { useState } from 'react';

// Mobile Sidebar Component
function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-gray-900 text-gray-300 border-gray-800 dark">
        <div className="flex flex-col h-full">
          <SheetHeader className="h-16 flex flex-row items-center justify-between px-6 border-b border-gray-800 space-y-0">
            <SheetTitle className="text-2xl font-semibold text-white tracking-wider">
              InsuraDesk
            </SheetTitle>
            {/* The default close button will appear here, so we removed the custom one */}
          </SheetHeader>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <NavLinks onLinkClick={() => setOpen(false)} />
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}


const generatePageTitle = (path: string): string => {
  if (path === '/dashboard') return 'Dashboard';
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return 'Dashboard';
  const title = parts[parts.length - 1] || '';
  if (/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(title)) {
    const parentTitle = parts[parts.length - 2] || 'Details';
    return parentTitle.charAt(0).toUpperCase() + parentTitle.slice(1);
  }
  return title.charAt(0).toUpperCase() + title.slice(1).replace(/-/g, ' ');
};

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const pageTitle = generatePageTitle(pathname);
  const userInitials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase();
  const getDisplayUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    try {
      const urlObj = new URL(url, window.location.origin);
      if (urlObj.pathname.startsWith('/media/')) {
        return `/api${urlObj.pathname}`;
      }
    } catch { return url; }
    return url;
  };
  const avatarUrl = getDisplayUrl(user?.profile?.profile_picture);

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* The Mobile menu button is now here, ensuring correct alignment */}
        <MobileSidebar />
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                <AvatarImage src={avatarUrl} alt={`${user?.first_name} ${user?.last_name}`} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.first_name || 'User'} {user?.last_name || ''}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings?tab=security">
                <Settings className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}