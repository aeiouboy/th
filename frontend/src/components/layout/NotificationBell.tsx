'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { Bell } from 'lucide-react';
import { type BudgetAlert, type ChargeabilityAlert, severityColorClass, compareSeverity } from '@/components/reports/types';

type UnifiedAlert = {
  id: string;
  name: string;
  detail: string;
  severity: string;
};

interface PersonalNotification {
  id: string;
  type: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const BUDGET_ROLES = ['admin', 'pmo', 'finance'];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    api.get<{ role: string }>('/users/me').then((p) => setUserRole(p.role)).catch(() => {});
  }, []);

  const canViewBudgets = userRole != null && BUDGET_ROLES.includes(userRole);

  const { data: budgetAlerts = [] } = useQuery<BudgetAlert[]>({
    queryKey: ['reports', 'budget-alerts'],
    queryFn: () => api.get('/reports/budget-alerts'),
    staleTime: 30_000,
    enabled: canViewBudgets,
  });

  const { data: chargeabilityAlerts = [] } = useQuery<ChargeabilityAlert[]>({
    queryKey: ['reports', 'chargeability-alerts'],
    queryFn: () => api.get('/budgets/chargeability-alerts'),
    staleTime: 30_000,
    enabled: canViewBudgets,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count'),
    staleTime: 30_000,
  });

  const { data: unreadNotifications = [] } = useQuery<PersonalNotification[]>({
    queryKey: ['notifications', 'unread-preview'],
    queryFn: () => api.get('/notifications?limit=3&unreadOnly=true'),
    staleTime: 30_000,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = unreadCountData?.count ?? 0;
  const alertCount = budgetAlerts.length + chargeabilityAlerts.length;
  // Badge shows only actionable unread notifications (not real-time alerts which user can't dismiss)
  const badgeCount = unreadCount;

  const topAlerts = useMemo<UnifiedAlert[]>(() => {
    return [
      ...budgetAlerts.map((a) => {
        const usage = a.budget > 0 ? Math.round((a.actual / a.budget) * 100) : 0;
        const isOver = a.actual > a.budget;
        return {
          id: `budget-${a.chargeCodeId}`,
          name: a.name,
          detail: isOver
            ? `Over budget: ${usage}% used (${Math.round(((a.actual - a.budget) / a.budget) * 100)}% over)`
            : `Budget at risk: ${usage}% used`,
          severity: a.severity,
        };
      }),
      ...chargeabilityAlerts.map((a) => ({
        id: `charge-${a.employeeId}`,
        name: a.name,
        detail: `Chargeability: ${a.chargeability.toFixed(1)}% (target ${a.target}%)`,
        severity: a.severity,
      })),
    ]
      .sort((a, b) => compareSeverity(a.severity, b.severity))
      .slice(0, 5);
  }, [budgetAlerts, chargeabilityAlerts]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleNotificationClick = (notification: PersonalNotification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    setOpen(false);
    router.push('/notifications');
  };

  const navigateToNotifications = () => {
    setOpen(false);
    router.push('/notifications');
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 relative transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--accent-teal)] text-white text-[10px] font-bold leading-none px-1">
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-lg z-50">
          <div className="px-4 py-3 border-b border-[var(--border-default)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">
              Notifications
            </h3>
          </div>

          {/* Personal notifications section */}
          {unreadNotifications.length > 0 && (
            <>
              <div className="px-4 py-2 border-b border-[var(--border-default)]">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Personal
                </p>
              </div>
              <ul>
                {unreadNotifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors flex items-start gap-3 border-b border-[var(--border-default)]"
                    >
                      <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 bg-teal-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {notification.subject}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {notification.body}
                        </p>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0 mt-0.5">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Budget/chargeability alerts section */}
          {topAlerts.length > 0 && (
            <>
              {unreadNotifications.length > 0 && (
                <div className="px-4 py-2 border-b border-[var(--border-default)]">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Alerts
                  </p>
                </div>
              )}
              <ul className="max-h-48 overflow-y-auto">
                {topAlerts.map((alert) => (
                  <li key={alert.id}>
                    <button
                      onClick={navigateToNotifications}
                      className="w-full text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors flex items-start gap-3 border-b border-[var(--border-default)] last:border-b-0"
                    >
                      <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${severityColorClass(alert.severity)}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {alert.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {alert.detail}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Empty state */}
          {topAlerts.length === 0 && unreadNotifications.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No notifications - everything is on track.
            </div>
          )}

          {/* Footer link */}
          <div className="px-4 py-2.5 border-t border-[var(--border-default)]">
            <button
              onClick={navigateToNotifications}
              className="text-xs font-medium text-[var(--accent-teal)] hover:underline"
            >
              View all notifications &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
