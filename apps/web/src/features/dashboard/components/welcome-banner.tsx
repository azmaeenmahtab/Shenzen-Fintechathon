'use client';

import * as React from 'react';
import Link from 'next/link';
import { TrendingUp, AlertTriangle, FileSpreadsheet, Compass } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSession } from '@/features/auth';

const QUICK_ACTIONS = [
  { label: 'Check Cash Forecast', href: '/forecast', icon: TrendingUp },
  { label: 'View Risk Alerts', href: '/alerts', icon: AlertTriangle },
  { label: 'Upload Ledger Data', href: '/imports', icon: FileSpreadsheet },
];

export function WelcomeBanner() {
  const { user } = useSession();
  const [timeOfDay, setTimeOfDay] = React.useState('morning');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setTimeOfDay('morning');
    } else if (hour < 17) {
      setTimeOfDay('afternoon');
    } else {
      setTimeOfDay('evening');
    }
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <Card className="border border-border/70 bg-card text-card-foreground apple-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <Compass className="h-4 w-4 text-primary shrink-0" />
            <span>Good {timeOfDay}, {firstName}</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            SME Treasury Cockpit — monitoring liquidity exposure and actionable remedies for Harbor Wholesale.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground transition-all duration-150 hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
