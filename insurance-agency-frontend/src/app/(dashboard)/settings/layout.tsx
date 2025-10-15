'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../../hooks/use-auth";
import { cn } from "../../../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Terminal } from "lucide-react";

// **CHANGE:** Remove the global "Commission Rules" link.
// Management will now happen directly via the "Insurance Providers" page.
const settingsNavLinks = [
  { name: "Users & Roles", href: "/settings/users" },
  { name: "Insurance Providers", href: "/settings/providers" },
  { name: "Policy Types", href: "/settings/policy-types" },
  { name: "Payouts", href: "/settings/payouts", disabled: false },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const hasAccess = user?.roles.includes('Agency Admin') || user?.roles.includes('Superuser');

  if (!hasAccess) {
    return (
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have the necessary permissions to view this page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your agency's core configurations.</p>
      </div>
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {settingsNavLinks.map((item) => (
              <Link
                key={item.name}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "inline-flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 justify-start",
                  pathname.startsWith(item.href) ? "bg-muted" : "bg-transparent",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-4xl">{children}</div>
      </div>
    </div>
  );
}