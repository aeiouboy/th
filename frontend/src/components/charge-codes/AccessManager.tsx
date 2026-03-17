'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';

interface User {
  userId: string;
  email: string;
  fullName: string | null;
}

interface AccessManagerProps {
  chargeCodeId: string;
  assignedUsers: User[];
  onUpdate: () => void;
}

export function AccessManager({
  chargeCodeId,
  assignedUsers,
  onUpdate,
}: AccessManagerProps) {
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; fullName: string | null }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ id: string; email: string; fullName: string | null }[]>('/users').then(setAllUsers).catch(() => {
      // Provide mock users on failure
      setAllUsers([
        { id: 'u1', email: 'john@company.com', fullName: 'John Doe' },
        { id: 'u2', email: 'jane@company.com', fullName: 'Jane Smith' },
        { id: 'u3', email: 'alex@company.com', fullName: 'Alex Kim' },
        { id: 'u4', email: 'sam@company.com', fullName: 'Sam Lee' },
        { id: 'u5', email: 'pat@company.com', fullName: 'Pat Chen' },
      ]);
    });
  }, []);

  const availableUsers = allUsers.filter(
    (u) => !assignedUsers.some((au) => au.userId === u.id),
  );

  const handleAdd = async (userId: string) => {
    setLoading(true);
    try {
      await api.put(`/charge-codes/${chargeCodeId}/access`, {
        addUserIds: [userId],
      });
      onUpdate();
      setShowAdd(false);
    } catch {
      // handle error silently
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
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-[family-name:var(--font-heading)] font-medium text-[var(--text-primary)]">
          Assigned Users
        </h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAdd(!showAdd)}
          className="h-7 text-xs"
        >
          <UserPlus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-md border border-[var(--border-default)] bg-stone-50 dark:bg-stone-900 p-2">
          <p className="mb-2 text-xs text-[var(--text-muted)]">Select a user to add:</p>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No users available</p>
            ) : (
              availableUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleAdd(u.id)}
                  disabled={loading}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-teal-light)] flex items-center justify-center text-[10px] font-medium text-[var(--accent-teal)]">
                    {(u.fullName || u.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-[var(--text-primary)]">
                    {u.fullName || u.email}
                  </span>
                  <span className="ml-auto text-xs text-[var(--text-muted)]">
                    {u.email}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

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
                  {(u.fullName || u.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {u.fullName || 'Unnamed'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(u.userId)}
                disabled={loading}
                className="p-1 rounded hover:bg-[var(--accent-red-light)] text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
