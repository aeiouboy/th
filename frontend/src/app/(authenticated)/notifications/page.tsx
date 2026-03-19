'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { Bell, CheckCircle, BarChart3, TrendingUp, CheckCheck, Inbox, AlertTriangle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { type BudgetAlert, type ChargeabilityAlert, severityColorClass, compareSeverity } from '@/components/reports/types';
import type { LucideIcon } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  recipientId: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

const LIMIT = 20;

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'timesheet_reminder', label: 'Reminders' },
  { value: 'approval_reminder', label: 'Approvals' },
  { value: 'manager_summary', label: 'Summaries' },
  { value: 'weekly_insights', label: 'Insights' },
] as const;

const TYPE_ICONS: Record<string, LucideIcon> = {
  timesheet_reminder: Bell,
  approval_reminder: CheckCircle,
  manager_summary: BarChart3,
  weekly_insights: TrendingUp,
  budget_alert: DollarSign,
  chargeability_alert: AlertTriangle,
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', { limit: LIMIT, offset }],
    queryFn: () => api.get<Notification[]>(`/notifications?limit=${LIMIT}&offset=${offset}`),
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
  });

  const { data: budgetAlerts = [] } = useQuery<BudgetAlert[]>({
    queryKey: ['reports', 'budget-alerts'],
    queryFn: () => api.get('/reports/budget-alerts'),
    staleTime: 30_000,
  });

  const { data: chargeabilityAlerts = [] } = useQuery<ChargeabilityAlert[]>({
    queryKey: ['reports', 'chargeability-alerts'],
    queryFn: () => api.get('/budgets/chargeability-alerts'),
    staleTime: 30_000,
  });

  // Merge real-time alerts into unified notification format
  const alertNotifications = useMemo<Notification[]>(() => {
    const alerts: Notification[] = [];
    for (const a of budgetAlerts) {
      const usage = a.budget > 0 ? Math.round((a.actual / a.budget) * 100) : 0;
      const isOver = a.actual > a.budget;
      alerts.push({
        id: `budget-alert-${a.chargeCodeId}`,
        type: 'budget_alert',
        recipientId: '',
        subject: `${a.name} — ${isOver ? 'Over Budget' : 'Budget at Risk'}`,
        body: isOver
          ? `Actual ฿${a.actual.toLocaleString()} exceeds budget ฿${a.budget.toLocaleString()} (${usage}% used)`
          : `${usage}% of budget consumed. Forecast may exceed budget.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        readAt: null,
      });
    }
    for (const a of chargeabilityAlerts) {
      alerts.push({
        id: `charge-alert-${a.employeeId}`,
        type: 'chargeability_alert',
        recipientId: '',
        subject: `${a.name} — Low Chargeability`,
        body: `Chargeability ${a.chargeability.toFixed(1)}% is below the ${a.target}% target.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        readAt: null,
      });
    }
    return alerts;
  }, [budgetAlerts, chargeabilityAlerts]);

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => { /* silently ignore — may be alert or other user's notification */ },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Budget alerts → navigate to Budget page
    if (notification.id.startsWith('budget-alert-')) {
      router.push('/budget');
      return;
    }
    // Chargeability alerts → navigate to Reports page
    if (notification.id.startsWith('charge-alert-')) {
      router.push('/reports');
      return;
    }
    // DB notifications → mark as read + toggle expand
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    setExpandedId(expandedId === notification.id ? null : notification.id);
  };

  const allNotifications = [...alertNotifications, ...notifications];

  const filteredNotifications = typeFilter === 'all'
    ? allNotifications
    : typeFilter === 'alerts'
      ? alertNotifications
      : notifications.filter((n) => n.type === typeFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          (unreadCount?.count || alertNotifications.length)
            ? `${(unreadCount?.count ?? 0) + alertNotifications.length} items`
            : 'All caught up'
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || !unreadCount?.count}
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </Button>
        }
      />

      <Tabs value={typeFilter} onValueChange={(v) => { setTypeFilter(v as string); setOffset(0); }}>
        <TabsList className="bg-stone-100 dark:bg-stone-800">
          {TYPE_FILTERS.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TYPE_FILTERS.map((filter) => (
          <TabsContent key={filter.value} value={filter.value} className="mt-4">
            {isLoading ? (
              <NotificationSkeleton />
            ) : filteredNotifications.length === 0 ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <EmptyState
                  icon={Inbox}
                  title="No notifications"
                  description={
                    typeFilter === 'all'
                      ? 'You have no notifications yet'
                      : `No ${filter.label.toLowerCase()} notifications`
                  }
                />
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-[var(--border-default)]">
                {filteredNotifications.map((notification) => {
                  const Icon = TYPE_ICONS[notification.type] || Bell;
                  const isExpanded = expandedId === notification.id;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
                    >
                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            notification.isRead
                              ? 'bg-stone-300 dark:bg-stone-600'
                              : 'bg-teal-500'
                          }`}
                        />
                      </div>

                      {/* Icon */}
                      <div className="mt-0.5 shrink-0">
                        <Icon
                          className={`w-5 h-5 ${
                            notification.isRead
                              ? 'text-[var(--text-muted)]'
                              : 'text-teal-600 dark:text-teal-400'
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            notification.isRead
                              ? 'font-normal text-[var(--text-secondary)]'
                              : 'font-semibold text-[var(--text-primary)]'
                          }`}
                        >
                          {notification.subject}
                        </p>
                        <p
                          className={`text-sm text-[var(--text-muted)] mt-0.5 ${
                            isExpanded ? '' : 'line-clamp-2'
                          }`}
                        >
                          {notification.body}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <span className="text-xs text-[var(--text-muted)] shrink-0 mt-0.5">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Load more */}
      {filteredNotifications.length >= LIMIT && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setOffset((prev) => prev + LIMIT)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 animate-pulse space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-2.5 h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full mt-1.5" />
          <div className="w-5 h-5 bg-stone-200 dark:bg-stone-700 rounded mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
          </div>
          <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-12" />
        </div>
      ))}
    </div>
  );
}
