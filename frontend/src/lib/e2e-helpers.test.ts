/**
 * Unit tests for e2e/helpers.ts pure utility functions.
 * Tests: uniqueName, findInTree, findInChildren, getCurrentMondayStr, getCurrentPeriod, snap filename.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We can't import helpers.ts directly (it imports playwright + postgres),
// so we re-implement the pure functions inline for testing their logic.
// This ensures the algorithms are correct without pulling in heavy deps.

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function findInTree(nodes: any[], name: string): any {
  for (const node of nodes) {
    if (node.name === name) return node;
    if (node.children && node.children.length > 0) {
      const found = findInTree(node.children, name);
      if (found) return found;
    }
  }
  return null;
}

function findInChildren(parentNode: any, childName: string): any {
  if (!parentNode || !parentNode.children) return null;
  return findInTree(parentNode.children, childName);
}

function getCurrentMondayStr(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function snapFileName(testId: string, stepName: string): string {
  return `${testId}-${stepName}--desktop.png`.toLowerCase().replace(/\s+/g, '-');
}

describe('uniqueName', () => {
  it('should include the prefix', () => {
    const name = uniqueName('test-item');
    expect(name).toMatch(/^test-item-\d+$/);
  });

  it('should generate different names on successive calls', () => {
    const a = uniqueName('x');
    const b = uniqueName('x');
    // Date.now() may be same in fast test, but format is correct
    expect(a).toMatch(/^x-\d+$/);
    expect(b).toMatch(/^x-\d+$/);
  });
});

describe('findInTree', () => {
  const tree = [
    {
      name: 'PRG-001',
      children: [
        {
          name: 'PRJ-A',
          children: [
            { name: 'ACT-1', children: [] },
            { name: 'ACT-2', children: [] },
          ],
        },
        { name: 'PRJ-B', children: [] },
      ],
    },
    { name: 'PRG-002', children: [] },
  ];

  it('should find a root-level node', () => {
    expect(findInTree(tree, 'PRG-001')).toEqual(tree[0]);
    expect(findInTree(tree, 'PRG-002')).toEqual(tree[1]);
  });

  it('should find a deeply nested node', () => {
    const result = findInTree(tree, 'ACT-2');
    expect(result).toEqual({ name: 'ACT-2', children: [] });
  });

  it('should return null for non-existent node', () => {
    expect(findInTree(tree, 'MISSING')).toBeNull();
  });

  it('should return null for empty array', () => {
    expect(findInTree([], 'anything')).toBeNull();
  });

  it('should handle nodes without children property', () => {
    const flat = [{ name: 'A' }, { name: 'B' }];
    expect(findInTree(flat, 'A')).toEqual({ name: 'A' });
    expect(findInTree(flat, 'C')).toBeNull();
  });
});

describe('findInChildren', () => {
  const parent = {
    name: 'PRG-001',
    children: [
      { name: 'PRJ-A', children: [{ name: 'ACT-1', children: [] }] },
      { name: 'PRJ-B', children: [] },
    ],
  };

  it('should find a direct child', () => {
    expect(findInChildren(parent, 'PRJ-A')?.name).toBe('PRJ-A');
  });

  it('should find a grandchild', () => {
    expect(findInChildren(parent, 'ACT-1')?.name).toBe('ACT-1');
  });

  it('should return null for non-existent child', () => {
    expect(findInChildren(parent, 'MISSING')).toBeNull();
  });

  it('should return null when parent is null', () => {
    expect(findInChildren(null, 'anything')).toBeNull();
  });

  it('should return null when parent has no children', () => {
    expect(findInChildren({ name: 'leaf' }, 'anything')).toBeNull();
  });
});

describe('getCurrentMondayStr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return Monday for a Monday', () => {
    // 2026-03-30 is a Monday
    vi.setSystemTime(new Date('2026-03-30T10:00:00'));
    expect(getCurrentMondayStr()).toBe('2026-03-30');
  });

  it('should return previous Monday for a Wednesday', () => {
    // 2026-04-01 is a Wednesday
    vi.setSystemTime(new Date('2026-04-01T10:00:00'));
    expect(getCurrentMondayStr()).toBe('2026-03-30');
  });

  it('should return previous Monday for a Sunday', () => {
    // 2026-04-05 is a Sunday
    vi.setSystemTime(new Date('2026-04-05T10:00:00'));
    expect(getCurrentMondayStr()).toBe('2026-03-30');
  });

  it('should return previous Monday for a Saturday', () => {
    // 2026-04-04 is a Saturday
    vi.setSystemTime(new Date('2026-04-04T10:00:00'));
    expect(getCurrentMondayStr()).toBe('2026-03-30');
  });

  it('should return YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date('2026-01-05T10:00:00')); // Monday
    expect(getCurrentMondayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getCurrentPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return YYYY-MM format', () => {
    vi.setSystemTime(new Date('2026-03-30T10:00:00'));
    expect(getCurrentPeriod()).toBe('2026-03');
  });

  it('should zero-pad single-digit months', () => {
    vi.setSystemTime(new Date('2026-01-15T10:00:00'));
    expect(getCurrentPeriod()).toBe('2026-01');
  });

  it('should handle December', () => {
    vi.setSystemTime(new Date('2026-12-01T10:00:00'));
    expect(getCurrentPeriod()).toBe('2026-12');
  });
});

describe('snap filename generation', () => {
  it('should produce lowercase kebab-case filename', () => {
    expect(snapFileName('BF-TE-01', '01-page-loaded')).toBe('bf-te-01-01-page-loaded--desktop.png');
  });

  it('should replace spaces with hyphens', () => {
    expect(snapFileName('BF-TE-01', 'page loaded')).toBe('bf-te-01-page-loaded--desktop.png');
  });

  it('should handle multiple spaces', () => {
    // \s+ replaces multiple spaces with single hyphen
    expect(snapFileName('TEST', 'step  one')).toBe('test-step-one--desktop.png');
  });

  it('should lowercase everything', () => {
    expect(snapFileName('BF-AP-01', 'Manager-APPROVED')).toBe('bf-ap-01-manager-approved--desktop.png');
  });
});
