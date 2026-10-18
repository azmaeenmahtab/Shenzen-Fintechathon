'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  Landmark,
  GitBranch,
  ShieldCheck,
  Bot,
  FileCheck2,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/features/auth';
import { hasPermission, type Permission } from '@harbor/contracts';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  section: 'Cockpit' | 'Remedies' | 'Operations';
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Your financial overview',
    icon: LayoutDashboard,
    section: 'Cockpit',
    permission: 'finance:read',
  },
  {
    href: '/forecast',
    label: 'Forecast',
    description: 'Future cash projections',
    icon: TrendingUp,
    section: 'Cockpit',
    permission: 'finance:read',
  },
  {
    href: '/alerts',
    label: 'Alerts',
    description: 'Issues needing attention',
    icon: AlertTriangle,
    section: 'Cockpit',
    permission: 'finance:read',
  },
  {
    href: '/financing',
    label: 'Financing',
    description: 'Borrowing options',
    icon: Landmark,
    section: 'Remedies',
    permission: 'finance:read',
  },
  {
    href: '/scenarios',
    label: 'Scenarios',
    description: 'What-if analysis',
    icon: GitBranch,
    section: 'Remedies',
    permission: 'scenarios:write',
  },
  {
    href: '/actions',
    label: 'Actions',
    description: 'Approve decisions',
    icon: ShieldCheck,
    section: 'Remedies',
    permission: 'actions:propose',
  },
  {
    href: '/agent',
    label: 'Agent',
    description: 'AI finance assistant',
    icon: Bot,
    section: 'Operations',
    permission: 'agent:use',
  },
  {
    href: '/imports',
    label: 'Imports',
    description: 'Upload bank & invoice data',
    icon: FileSpreadsheet,
    section: 'Operations',
    permission: 'imports:write',
  },
  {
    href: '/proof',
    label: 'Proof & Audit',
    description: 'Verified records',
    icon: FileCheck2,
    section: 'Operations',
    permission: 'audit:export',
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Preferences & team',
    icon: Settings,
    section: 'Operations',
    permission: 'settings:manage',
  },
];

export interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: NavItem[];
  onItemClick?: () => void;
}

export function SidebarNav({
  items = NAV_ITEMS,
  onItemClick,
  className,
  ...props
}: SidebarNavProps) {
  const pathname = usePathname();
  const { role } = useSession();

  const filteredItems = React.useMemo(() => {
    if (!role || role === 'owner' || role === 'employee') return items;
    return items.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(role, item.permission);
    });
  }, [items, role]);

  const sections: { id: 'Cockpit' | 'Remedies' | 'Operations'; label: string }[] = [
    { id: 'Cockpit', label: 'Cash Cockpit' },
    { id: 'Remedies', label: 'Decision Loop' },
    { id: 'Operations', label: 'Governance & Data' },
  ];

  return (
    <nav className={cn('flex flex-col gap-3', className)} {...props}>
      {sections.map((section) => {
        const sectionItems = filteredItems.filter((i) => i.section === section.id);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section.id} className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 select-none">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                        : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
