'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, ChevronUp, Layers, Clock, Sparkles, ArrowRight, FileText } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMinor, type RankedFinancingOffer } from '@harbor/contracts';
import { ScoreBreakdown } from './score-breakdown';
import { ScheduleTable } from './schedule-table';
import { FacilitySummaryDialog } from './facility-summary-dialog';

interface OfferCardProps {
  ranked: RankedFinancingOffer;
  rankIndex: number;
  requiredGapMinor?: number;
  breachDate?: string | null;
  floorMinor?: number;
  openingCashMinor?: number;
}

export function OfferCard({
  ranked,
  rankIndex,
  requiredGapMinor,
  breachDate,
  floorMinor,
  openingCashMinor,
}: OfferCardProps) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const { offer, schedule, impact, score, scoringBreakdown, warnings } = ranked;

  const hasNegativeCash = impact.anyNegativeCash;
  const isTopRanked = rankIndex === 0;

  return (
    <Card className={`apple-card relative overflow-hidden transition-all duration-200 border ${isTopRanked ? 'border-primary/50 shadow-sm ring-1 ring-primary/20 bg-card' : 'border-border/70 hover:border-border/90 bg-card/90'}`}>
      {/* Top Ranked Ribbon */}
      {isTopRanked && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Best Recommended Match</span>
        </div>
      )}

      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                {offer.name}
              </h3>
              <Badge variant="outline" className="text-[11px] font-medium border-border text-muted-foreground">
                Synthetic offer
              </Badge>
              <Badge variant="secondary" className="text-[11px] font-mono capitalize">
                {offer.type.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {offer.description}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:text-right shrink-0">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-1.5 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">Fit Score</span>
              <span className="text-xl font-mono font-bold text-primary">
                {(score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-1 space-y-4">
        {/* Warnings Banner */}
        {(hasNegativeCash || warnings.length > 0) && (
          <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Repayment Caution Notice</span>
            </div>
            {warnings.map((warn, i) => (
              <p key={i} className="text-[11px] text-amber-800/90 dark:text-amber-300/90 pl-5.5">
                • {warn}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50 text-xs">
          <div>
            <span className="text-[11px] text-muted-foreground block">Principal Amount</span>
            <span className="text-sm font-mono font-semibold text-foreground">{formatMinor(schedule.principalMinor)}</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Upfront Fee ({offer.upfrontFeeBps} bps)</span>
            <span className="text-sm font-mono font-medium text-foreground">{formatMinor(schedule.upfrontFeeMinor)}</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Net Cash Proceeds</span>
            <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatMinor(schedule.netProceedsMinor)}</span>
          </div>
          <div className="bg-primary/5 dark:bg-primary/10 -m-1.5 p-2 rounded-lg border border-primary/20">
            <span className="text-[11px] font-semibold text-primary block uppercase tracking-wider">Total Borrowing Cost</span>
            <span className="text-sm font-mono font-bold text-primary">{formatMinor(schedule.totalCostMinor)}</span>
          </div>
        </div>

        {/* Terms details & timing row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>
              Funding Delay: <strong className="text-foreground">{offer.fundingDelayDays} {offer.fundingDelayDays === 1 ? 'day' : 'days'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>
              Repayment Count: <strong className="text-foreground">{offer.installments.count} {offer.installments.count === 1 ? 'installment' : 'installments'}</strong>
            </span>
          </div>

          <div>
            <span>
              Lowest Cash: <strong className={impact.minCashMinor < 0 ? 'text-destructive font-bold' : 'text-foreground'}>
                {formatMinor(impact.minCashMinor)}
              </strong>
            </span>
          </div>
        </div>

        {/* Explainable Score Breakdown */}
        <ScoreBreakdown breakdown={scoringBreakdown} />

        {/* Expandable Schedule Table */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSchedule(!showSchedule)}
            className="w-full justify-between h-8 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border/80"
          >
            <span>Repayment Schedule Details ({schedule.installments.length} items)</span>
            {showSchedule ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          {showSchedule && (
            <ScheduleTable
              installments={schedule.installments}
              totalRepaymentMinor={schedule.totalRepaymentMinor}
            />
          )}
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSummary(true)}
          className="h-8 text-xs gap-1.5 text-foreground hover:bg-primary/10 hover:text-primary border-primary/30"
          data-testid={`view-summary-btn-${offer.code}`}
        >
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span>View Summary</span>
        </Button>

        <Button asChild size="sm" className="h-8 text-xs gap-1.5 shadow-xs">
          <Link href={`/scenarios?preset=offer:${offer.code}&amount=${schedule.principalMinor}`}>
            Compare in Scenario Studio
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>

        <FacilitySummaryDialog
          open={showSummary}
          onOpenChange={setShowSummary}
          ranked={ranked}
          requiredGapMinor={requiredGapMinor}
          breachDate={breachDate}
          floorMinor={floorMinor}
          openingCashMinor={openingCashMinor}
        />
      </CardFooter>
    </Card>
  );
}
