'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatMinor } from '@harbor/contracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ViewToggle, type ForecastGranularity } from './view-toggle';
import { AccessibleChartSummary } from '@/components/data';
import type { LatestForecastResponse } from '../api/use-latest-forecast';

export interface ForecastChartProps {
  forecast: LatestForecastResponse;
  onSelectDate: (date: string) => void;
  selectedDate?: string | null;
}

interface ChartItem {
  date: string;
  startDate?: string;
  displayDate: string;
  closingMajor: number;
  closingMinor: number;
  conservativeMajor?: number;
  conservativeMinor?: number;
  floorMajor: number;
  floorMinor: number;
  isNegative: boolean;
  isBelowFloor: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: ChartItem;
  }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0]) return null;
  const data = payload[0].payload;

  return (
    <div
      className="rounded-lg border border-border/80 bg-background/95 p-3 shadow-md backdrop-blur-xs text-xs space-y-1.5"
      data-testid="forecast-chart-tooltip"
    >
      <p className="font-semibold text-foreground">
        {data.startDate ? `Week: ${data.startDate} to ${data.date}` : `Date: ${data.date}`}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Baseline Closing:</span>
        <span
          className={`font-mono font-medium ${
            data.closingMinor < 0 ? 'text-destructive font-bold' : 'text-foreground'
          }`}
        >
          {formatMinor(data.closingMinor)}
        </span>
      </div>

      {data.conservativeMinor !== undefined && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Conservative Variant:</span>
          <span
            className={`font-mono font-medium ${
              data.conservativeMinor < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {formatMinor(data.conservativeMinor)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Liquidity Floor:</span>
        <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">
          {formatMinor(data.floorMinor)}
        </span>
      </div>

      <p className="text-[10px] text-primary italic pt-1 border-t border-border/50">
        Click point to view day drill-down
      </p>
    </div>
  );
}

export function ForecastChart({ forecast, onSelectDate, selectedDate }: ForecastChartProps) {
  const [granularity, setGranularity] = React.useState<ForecastGranularity>('daily');
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const { points, conservativePoints, weeklyBuckets, floorMinor } = forecast;

  const chartData: ChartItem[] = React.useMemo(() => {
    if (granularity === 'weekly') {
      return weeklyBuckets.map((bucket) => ({
        date: bucket.endDate,
        startDate: bucket.startDate,
        displayDate: bucket.endDate.slice(5),
        closingMajor: bucket.closingMinor / 100,
        closingMinor: bucket.closingMinor,
        floorMajor: floorMinor / 100,
        floorMinor,
        isNegative: bucket.closingMinor < 0,
        isBelowFloor: bucket.closingMinor < floorMinor,
      }));
    }

    const consMap = new Map<string, number>();
    if (conservativePoints) {
      conservativePoints.forEach((cp) => consMap.set(cp.date, cp.closingMinor));
    }

    return points.map((p) => {
      const consMinor = consMap.get(p.date);
      return {
        date: p.date,
        displayDate: p.date.slice(5),
        closingMajor: p.closingMinor / 100,
        closingMinor: p.closingMinor,
        conservativeMajor: consMinor !== undefined ? consMinor / 100 : undefined,
        conservativeMinor: consMinor,
        floorMajor: floorMinor / 100,
        floorMinor,
        isNegative: p.closingMinor < 0,
        isBelowFloor: p.closingMinor < floorMinor,
      };
    });
  }, [granularity, points, conservativePoints, weeklyBuckets, floorMinor]);

  const handlePointClick = (entry: unknown) => {
    const item = (entry as { activePayload?: { payload: ChartItem }[] })?.activePayload?.[0]?.payload;
    if (item?.date) {
      onSelectDate(item.date);
    }
  };

  return (
    <Card className="border-border/80 shadow-xs" data-testid="forecast-chart-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
        <div>
          <CardTitle className="text-base font-semibold">91-Day Cash Forecast Trajectory</CardTitle>
          <CardDescription className="text-xs">
            Deterministic cash progression vs policy floor • Conservative series models +14d overdue receivables
          </CardDescription>
        </div>
        <ViewToggle value={granularity} onChange={setGranularity} />
      </CardHeader>
      <CardContent className="pt-2">
        <div
          className="h-[340px] w-full min-w-0"
          data-testid="forecast-recharts-container"
          role="region"
          aria-label="91-Day Cash Forecast Trajectory Chart"
        >
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                onClick={handlePointClick}
                margin={{ top: 10, right: 20, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  interval={granularity === 'daily' ? 13 : 1}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val: number) => `¥${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                />

                {/* Zero cash reference line */}
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Zero Cash (¥0)',
                    position: 'insideBottomRight',
                    fill: 'hsl(var(--destructive))',
                    fontSize: 10,
                  }}
                />

                {/* Policy floor reference line */}
                <ReferenceLine
                  y={floorMinor / 100}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  label={{
                    value: `Floor: ${formatMinor(floorMinor)}`,
                    position: 'insideTopRight',
                    fill: '#d97706',
                    fontSize: 10,
                  }}
                />

                {/* Selected date marker */}
                {selectedDate && (
                  <ReferenceLine
                    x={selectedDate.slice(5)}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    label={{
                      value: selectedDate,
                      position: 'top',
                      fill: 'hsl(var(--primary))',
                      fontSize: 10,
                    }}
                  />
                )}

                {/* Conservative variant line */}
                {granularity === 'daily' && conservativePoints && (
                  <Line
                    type="monotone"
                    dataKey="conservativeMajor"
                    name="Conservative (+14d AR)"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}

                {/* Baseline closing line */}
                <Line
                  type="monotone"
                  dataKey="closingMajor"
                  name="Baseline Closing Cash"
                  stroke="#2563eb"
                  strokeWidth={2}
                  activeDot={{ r: 6, fill: '#2563eb', cursor: 'pointer' }}
                  dot={(props: { cx?: number; cy?: number; payload?: ChartItem }) => {
                    const { cx, cy, payload } = props;
                    if (!cx || !cy || !payload) return <g key={Math.random()} />;
                    if (payload.isNegative) {
                      return (
                        <circle
                          key={payload.date}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="hsl(var(--destructive))"
                          stroke="white"
                          strokeWidth={1}
                        />
                      );
                    }
                    if (payload.isBelowFloor) {
                      return (
                        <circle
                          key={payload.date}
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill="#d97706"
                          stroke="white"
                          strokeWidth={1}
                        />
                      );
                    }
                    return <g key={payload.date} />;
                  }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full bg-muted/10 rounded-md animate-pulse" />
          )}
        </div>

        <AccessibleChartSummary
          weeklyBuckets={weeklyBuckets}
          floorMinor={floorMinor}
          chartTitle="91-Day Cash Forecast"
        />
      </CardContent>
    </Card>
  );
}
