'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`;
  return `฿${value.toFixed(0)}`;
}

export interface ChargeCodeNode {
  id: string;
  name: string;
  level: string | null;
  parentId: string | null;
  budgetAmount: string | null;
  isBillable: boolean | null;
  children: ChargeCodeNode[];
}

const LEVEL_BADGE: Record<string, { label: string; className: string }> = {
  program: { label: 'PRG', className: 'bg-slate-600 text-white' },
  project: { label: 'PRJ', className: 'bg-[var(--accent-teal)] text-white' },
  activity: { label: 'ACT', className: 'bg-[var(--accent-amber)] text-white' },
  task: { label: 'TSK', className: 'bg-[var(--accent-purple)] text-white' },
};

const CHILD_LEVEL: Record<string, string> = {
  program: 'project',
  project: 'activity',
  activity: 'task',
};

function TreeNode({
  node,
  selectedId,
  onSelect,
  onAddChild,
  depth = 0,
}: {
  node: ChargeCodeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild?: (parentId: string, parentLevel: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const badge = node.level ? LEVEL_BADGE[node.level] : null;
  const isSelected = selectedId === node.id;

  return (
    <div className="relative">
      {/* Tree connector lines */}
      {depth > 0 && (
        <>
          {/* Vertical connector line from parent */}
          <div
            className="absolute border-l-2 border-muted/40"
            style={{
              left: `${(depth - 1) * 24 + 20}px`,
              top: 0,
              height: expanded && hasChildren ? '100%' : '18px',
            }}
          />
          {/* Horizontal branch connector */}
          <div
            className="absolute border-t-2 border-muted/40"
            style={{
              left: `${(depth - 1) * 24 + 20}px`,
              top: '18px',
              width: '12px',
            }}
          />
        </>
      )}
      <button
        onClick={() => onSelect(node.id)}
        className={cn(
          'group/node relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--bg-card-hover)]',
          isSelected && 'bg-[var(--accent-teal-light)] ring-1 ring-[var(--accent-teal)]/20 font-medium',
          depth % 2 === 1 && !isSelected && 'bg-stone-50/50 dark:bg-stone-900/20',
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="shrink-0 rounded p-0.5 hover:bg-stone-200 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            )}
          </span>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}
        {badge && (
          <span
            className={cn(
              'shrink-0 rounded-[999px] px-1.5 py-0.5 text-[10px] font-semibold leading-none',
              badge.className,
            )}
          >
            {badge.label}
          </span>
        )}
        <span className="font-mono text-xs text-[var(--text-muted)] shrink-0">
          {node.id}
        </span>
        <span className={cn(
          'truncate text-left',
          isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]',
        )}>
          {node.name}
        </span>
        {node.budgetAmount && (
          <span className="ml-auto shrink-0 text-[11px] font-mono text-[var(--text-muted)] tabular-nums text-right min-w-[60px]">
            {formatCurrencyCompact(Number(node.budgetAmount))}
          </span>
        )}
        {onAddChild && node.level && CHILD_LEVEL[node.level] && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id, node.level!);
            }}
            className="shrink-0 rounded p-0.5 opacity-0 group-hover/node:opacity-100 hover:bg-stone-200 transition-all"
            title={`Add ${CHILD_LEVEL[node.level]}`}
          >
            <Plus className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          </span>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChargeCodeTree({
  tree,
  selectedId,
  onSelect,
  onAddChild,
}: {
  tree: ChargeCodeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild?: (parentId: string, parentLevel: string) => void;
}) {
  if (tree.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">
        No charge codes found
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}
