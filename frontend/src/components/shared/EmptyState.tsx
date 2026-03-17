'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[var(--bg-subtle)]">
        <Icon className="w-12 h-12 text-[var(--text-muted)]" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--text-secondary)] text-center max-w-sm">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--accent-teal)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
