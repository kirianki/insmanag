"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Users, DollarSign } from "lucide-react";

const tabs = [
    { name: "Expenses", href: "/finances/expenses", icon: DollarSign },
    { name: "Payroll", href: "/finances/payroll", icon: FileText },
    { name: "Staff Contracts", href: "/finances/contracts", icon: Users },
];

export default function FinancesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="space-y-6">
            <div className="border-b">
                <div className="flex h-12 items-center space-x-6 px-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = pathname === tab.href;

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    "inline-flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                                    isActive
                                        ? "text-primary border-b-2 border-primary h-full"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="px-4 pb-8">
                {children}
            </div>
        </div>
    );
}
