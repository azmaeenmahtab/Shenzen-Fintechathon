'use client';

import * as React from 'react';
import { Bot, AlertTriangle, Clock } from 'lucide-react';
import { ModeBadge } from './mode-badge';
import { EvidenceChips } from './evidence-chips';
import { ProposalLinkCard } from './proposal-link-card';
import type { AgentRunStatus } from '@harbor/contracts';
import { cn } from '@/lib/utils';

export interface AssistantMessageProps {
  content?: string;
  mode?: 'live' | 'replay';
  status?: AgentRunStatus;
  fallbackUsed?: boolean;
  evidenceRefs?: string[];
  proposalIds?: string[];
  createdAt?: string;
  className?: string;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-foreground">
          {boldText}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderFormattedBody(rawContent: string) {
  const lines = rawContent.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Empty lines act as spacing
    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-1.5" />);
      continue;
    }

    // Horizontal rule divider
    if (/^---+$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-border/40" />);
      continue;
    }

    // Headings (e.g., ### 1. Liquidity Gap Summary or ## Summary)
    const headingMatch = trimmed.match(/^#{1,4}\s+(.*)$/);
    if (headingMatch) {
      const headingContent = headingMatch[1]!.replace(/^\*\*|\*\*$/g, '').trim();
      elements.push(
        <h4 key={`h-${i}`} className="font-semibold text-sm text-foreground mt-2 mb-1 tracking-tight">
          {renderInlineFormatting(headingContent)}
        </h4>,
      );
      continue;
    }

    // Bullet points (hyphen -, asterisk *, or numbered list 1.)
    const bulletMatch = trimmed.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      const text = bulletMatch[3]!;
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 text-sm leading-relaxed my-0.5 ml-1">
          <span className="text-muted-foreground select-none shrink-0">•</span>
          <div className="flex-1">{renderInlineFormatting(text)}</div>
        </div>,
      );
      continue;
    }

    // Standard paragraph line
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed my-0.5">
        {renderInlineFormatting(line)}
      </p>,
    );
  }

  return elements;
}

/**
 * Renders the Copilot assistant response.
 * Safely parses formatting into clean React elements without raw HTML interpretation.
 * Displays fallback alert, mode badge, evidence chips, and action proposal notices.
 */
export function AssistantMessage({
  content,
  mode,
  status,
  fallbackUsed,
  evidenceRefs = [],
  proposalIds = [],
  createdAt,
  className,
}: AssistantMessageProps) {
  const isTimeout = status === 'timeout';
  const isFailed = status === 'failed';

  return (
    <div className={cn('apple-card flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4', className)}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground">Harbor Copilot</span>
          <ModeBadge mode={mode} />
        </div>

        {createdAt && (
          <span className="text-[11px] text-muted-foreground">
            {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Fallback & Error Status Banners */}
      {fallbackUsed && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Fallback summary (model unavailable)</span>
        </div>
      )}

      {isTimeout && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
          <Clock className="h-4 w-4 shrink-0" />
          <span>Run timed out. A fallback summary has been generated below.</span>
        </div>
      )}

      {isFailed && !fallbackUsed && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Run encountered an error during analysis.</span>
        </div>
      )}

      {/* Answer Content - Beautifully Structured, XSS-Safe Plain Elements */}
      {content ? (
        <div
          data-testid="assistant-answer"
          className="font-sans text-sm text-foreground leading-relaxed break-words space-y-0.5"
        >
          {renderFormattedBody(content)}
        </div>
      ) : (
        <div className="text-xs italic text-muted-foreground">
          No response generated.
        </div>
      )}

      {/* Grounding Evidence Chips */}
      {evidenceRefs.length > 0 && (
        <div className="mt-1 pt-2 border-t border-border/50">
          <EvidenceChips evidenceRefs={evidenceRefs} />
        </div>
      )}

      {/* Proposal Created Card */}
      {proposalIds.length > 0 && (
        <div className="mt-1">
          <ProposalLinkCard proposalIds={proposalIds} />
        </div>
      )}
    </div>
  );
}
