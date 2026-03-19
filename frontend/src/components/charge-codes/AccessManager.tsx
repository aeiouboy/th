'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, UserPlus, Search, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface User {
  userId: string;
  email: string;
  fullName: string | null;
}

interface AllUser {
  id: string;
  email: string;
  fullName: string | null;
}

interface AccessManagerProps {
  chargeCodeId: string;
  assignedUsers: User[];
  onUpdate: () => void;
  readOnly?: boolean;
}

export function AccessManager({
  chargeCodeId,
  assignedUsers,
  onUpdate,
  readOnly,
}: AccessManagerProps) {
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!readOnly) {
      api.get<AllUser[]>('/users').then(setAllUsers).catch(() => {});
    }
  }, [readOnly]);

  const availableUsers = useMemo(
    () => allUsers.filter((u) => !assignedUsers.some((au) => au.userId === u.id)),
    [allUsers, assignedUsers],
  );

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return availableUsers;
    const q = search.toLowerCase();
    return availableUsers.filter(
      (u) =>
        (u.fullName?.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q),
    );
  }, [availableUsers, search]);

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      await api.put(`/charge-codes/${chargeCodeId}/access`, {
        addUserIds: Array.from(selected),
      });
      toast.success(`Added ${selected.size} user${selected.size > 1 ? 's' : ''}`);
      setSelected(new Set());
      setSearch('');
      setShowAdd(false);
      onUpdate();
    } catch {
      toast.error('Failed to add users');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setLoading(true);
    try {
      await api.put(`/charge-codes/${chargeCodeId}/access`, {
        removeUserIds: [userId],
      });
      onUpdate();
    } catch {
      toast.error('Failed to remove user');
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name: string | null, email: string) =>
    (name || email).charAt(0).toUpperCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-[family-name:var(--font-heading)] font-medium text-[var(--text-primary)]">
          Assigned Users
          {assignedUsers.length > 0 && (
            <span className="ml-1.5 text-xs text-[var(--text-muted)] font-normal">
              ({assignedUsers.length})
            </span>
          )}
        </h4>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setShowAdd(!showAdd); setSelected(new Set()); setSearch(''); }}
            className="h-7 text-xs"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="rounded-md border border-[var(--border-default)] bg-stone-50 dark:bg-stone-900 p-2 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-xs"
              autoFocus
            />
          </div>

          {/* User list with checkboxes */}
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-2 text-center">
                {search ? 'No users found' : 'No users available'}
              </p>
            ) : (
              filteredUsers.map((u) => {
                const isChecked = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleSelect(u.id)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      isChecked
                        ? 'bg-[var(--accent-teal-light)] dark:bg-teal-900/30'
                        : 'hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isChecked
                        ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)]'
                        : 'border-stone-300 dark:border-stone-600'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-teal-light)] flex items-center justify-center text-[10px] font-medium text-[var(--accent-teal)] shrink-0">
                      {getInitial(u.fullName, u.email)}
                    </div>
                    <span className="truncate text-[var(--text-primary)]">
                      {u.fullName || u.email}
                    </span>
                    <span className="ml-auto text-xs text-[var(--text-muted)] truncate max-w-[140px]">
                      {u.email}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-default)]">
            <span className="text-xs text-[var(--text-muted)]">
              {selected.size > 0 ? `${selected.size} selected` : 'Select users'}
            </span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowAdd(false); setSelected(new Set()); setSearch(''); }}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddSelected}
                disabled={selected.size === 0 || loading}
                className="h-7 text-xs bg-[var(--accent-teal)] hover:bg-teal-700 text-white"
              >
                {loading ? 'Adding...' : `Add ${selected.size > 0 ? `(${selected.size})` : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assigned users list */}
      <div className="space-y-1">
        {assignedUsers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No users assigned</p>
        ) : (
          assignedUsers.map((u) => (
            <div
              key={u.userId}
              className="flex items-center justify-between rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--accent-teal-light)] flex items-center justify-center text-xs font-medium text-[var(--accent-teal)]">
                  {getInitial(u.fullName, u.email)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {u.fullName || 'Unnamed'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                </div>
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleRemove(u.userId)}
                  disabled={loading}
                  className="p-1 rounded hover:bg-[var(--accent-red-light)] text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
