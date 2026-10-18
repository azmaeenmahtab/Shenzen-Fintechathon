'use client';

import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, TrendingDown, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Money } from '@/components/data/money';
import type { LatestForecastResponse } from '../api/use-latest-forecast';

export interface BreachSummaryProps {
  forecast: LatestForecastResponse;
  onSelectDate?: (date: string) => void;
}

export function BreachSummary({ forecast, onSelectDate }: BreachSummaryProps) {
  const { summary, floorMinor } = forecast;
  const hasBreach =
    Boolean(summary.firstBelowFloorDate) ||
    Boolean(summary.firstNegativeDate) ||
    summary.liquidityGapMinor > 0 ||
    summary.minCashMinor < floorMinor;

  if (!hasBreach) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-2xs" data-testid="breach-summary-healthy">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              No Liquidity Breach Projected
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Cash balance remains comfortably above policy floor ({formatMinorWrapper(floorMinor)}) across the 91-day horizon.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="breach-summary-breached">
      {/* 1. First Below Floor */}
      <Card className="apple-card border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
          <CardTitle className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            First Floor Breach
          </CardTitle>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-xl sm:text-2xl font-semibold font-mono tracking-tight text-foreground">
            {summary.firstBelowFloorDate ? (
              <button
                type="button"
                onClick={() => onSelectDate?.(summary.firstBelowFloorDate!)}
                className="hover:underline focus:outline-hidden text-left"
                title="Click to drill down"
              >
                {summary.firstBelowFloorDate}
              </button>
            ) : (
              <span className="text-sm font-normal text-muted-foreground">None within horizon</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Cash dips below policy floor (<Money minor={floorMinor} />)
          </p>
        </CardContent>
      </Card>

      {/* 2. First Negative Day */}
      <Card className="apple-card border-destructive/30 bg-destructive/[0.04]">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
          <CardTitle className="text-xs font-medium text-destructive uppercase tracking-wider">
            First Insolvent Day
          </CardTitle>
          <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-xl sm:text-2xl font-semibold font-mono tracking-tight text-foreground">
            {summary.firstNegativeDate ? (
              <button
                type="button"
                onClick={() => onSelectDate?.(summary.firstNegativeDate!)}
                className="hover:underline focus:outline-hidden text-left text-destructive font-semibold"
                title="Click to drill down"
              >
                {summary.firstNegativeDate}
              </button>
            ) : (
              <span className="text-sm font-normal text-muted-foreground">None within horizon</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Cash balance drops below ¥0.00</p>
        </CardContent>
      </Card>

      {/* 3. Lowest Cash Balance */}
      <Card className="apple-card border-border/70 bg-card/90">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Trough (Lowest Cash)
          </CardTitle>
          <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
            <TrendingDown className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-xl sm:text-2xl font-semibold tracking-tight">
            <Money minor={summary.minCashMinor} />
          </div>
          <p className="text-xs text-muted-foreground">
            Occurs on{' '}
            <button
              type="button"
              onClick={() => onSelectDate?.(summary.minCashDate)}
              className="font-medium font-mono text-foreground hover:underline focus:outline-hidden"
            >
              {summary.minCashDate}
            </button>
          </p>
        </CardContent>
      </Card>

      {/* 4. Liquidity Gap to Restore Floor */}
      <Card className="apple-card border-border/70 bg-card/90">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Liquidity Gap
          </CardTitle>
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="text-xl sm:text-2xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
            <Money minor={summary.liquidityGapMinor} />
          </div>
          <p className="text-xs text-muted-foreground">Funding needed to maintain policy floor</p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatMinorWrapper(minor: number): string {
  return `¥${(minor / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}
