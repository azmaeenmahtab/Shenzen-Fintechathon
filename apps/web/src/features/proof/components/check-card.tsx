'use client';

import * as React from 'react';
import { Play, Loader2, ShieldAlert, Users, Layers, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckResult } from './check-result';
import { useRunProofCheck } from '../api/use-run-proof-check';
import { useMe } from '@/features/auth';
import type { ProofCheckItem, ProofCheckRunResult } from '@harbor/contracts';
import { toast } from 'sonner';

const CHECK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'employee-execute': Users,
  'cross-tenant-lookup': Layers,
  'injection-import': ShieldAlert,
};

interface CheckCardProps {
  check: ProofCheckItem;
}

export function CheckCard({ check }: CheckCardProps): React.JSX.Element {
  const { data: me } = useMe();
  const { mutate: runCheck, isPending } = useRunProofCheck();
  const [localResult, setLocalResult] = React.useState<ProofCheckRunResult | null>(null);

  const activeResult = localResult || check.lastResult;
  const isOwner = me?.role === 'owner';
  const isEmployeeExecuteCheck = check.id === 'employee-execute';

  const Icon = CHECK_ICONS[check.id] || ShieldAlert;

  const handleRun = (): void => {
    toast.info(`Executing adversarial check: "${check.title}"...`);
    runCheck(check.id, {
      onSuccess: (res) => {
        setLocalResult(res);
        if (res.passed) {
          toast.success(`Check "${check.title}" passed: Invariant held!`);
        } else {
          toast.error(`Check "${check.title}" failed!`);
        }
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to execute check');
      },
    });
  };

  return (
    <Card className="apple-card border border-border/70 bg-card/90 transition-all hover:border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base font-bold tracking-tight">
                {check.title}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {check.description}
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleRun}
            disabled={isPending}
            className="flex-shrink-0 font-medium"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                <span>Run Check</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {isEmployeeExecuteCheck && isOwner && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <p>
              <span className="font-semibold">Note for Judges:</span> You are currently signed in as{' '}
              <span className="font-semibold uppercase">Owner</span> (who has execute authority). Sign in
              as the demo <span className="font-semibold uppercase">Employee</span> via the user menu to test 403 denial.
            </p>
          </div>
        )}

        {activeResult ? (
          <CheckResult result={activeResult} />
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            No live execution yet. Click <span className="font-medium text-foreground">&quot;Run Check&quot;</span> to
            execute against the active session.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
