'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  MailIcon,
  MessageSquareIcon,
  CalendarIcon,
  GlobeIcon,
  CheckIcon,
  DollarSignIcon,
  SendIcon,
  RefreshCwIcon,
  ShieldIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency';
import { api } from '@/lib/api';

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  email: boolean;
  inApp: boolean;
  teams: boolean;
}

const TIMEZONES = [
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (UTC+7)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
  { value: 'America/New_York', label: 'America/New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (UTC-8)' },
  { value: 'America/Chicago', label: 'America/Chicago (UTC-6)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (UTC+1)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+11)' },
];

const CURRENCY_OPTIONS = [
  { value: 'THB', label: 'THB (฿ Thai Baht)' },
  { value: 'USD', label: 'USD ($ US Dollar)' },
  { value: 'EUR', label: 'EUR (€ Euro)' },
  { value: 'JPY', label: 'JPY (¥ Japanese Yen)' },
];

export default function SettingsPage() {
  const { currency, setCurrency, formatCurrency, refreshSettings } = useCurrency();
  const [currencySaving, setCurrencySaving] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [defaultView, setDefaultView] = useState<'weekly' | 'bi-weekly'>('weekly');
  const [timezone, setTimezone] = useState('Asia/Bangkok');
  const [saved, setSaved] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const { data: userProfile } = useQuery<{ role: string }>({
    queryKey: ['me-settings'],
    queryFn: () => api.get('/users/me'),
  });
  const isAdmin = userProfile?.role === 'admin';

  const [notifications, setNotifications] = useState<NotificationPref[]>([
    {
      key: 'timesheet_reminder',
      label: 'Timesheet Reminders',
      description: 'Receive reminders to submit your timesheet',
      icon: <CalendarIcon className="w-4 h-4" />,
      email: true,
      inApp: true,
      teams: false,
    },
    {
      key: 'approval_update',
      label: 'Approval Updates',
      description: 'Notifications when timesheets are approved or rejected',
      icon: <CheckIcon className="w-4 h-4" />,
      email: true,
      inApp: true,
      teams: true,
    },
    {
      key: 'budget_alert',
      label: 'Budget Alerts',
      description: 'Alerts when charge codes approach budget limits',
      icon: <BellIcon className="w-4 h-4" />,
      email: false,
      inApp: true,
      teams: false,
    },
    {
      key: 'system_update',
      label: 'System Updates',
      description: 'Important system announcements and maintenance notices',
      icon: <MessageSquareIcon className="w-4 h-4" />,
      email: true,
      inApp: true,
      teams: false,
    },
  ]);

  function toggleNotification(index: number, channel: 'email' | 'inApp' | 'teams') {
    setNotifications((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [channel]: !next[index][channel] };
      return next;
    });
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'light' ? (
              <SunIcon className="w-4 h-4 text-[var(--accent-amber)]" />
            ) : (
              <MoonIcon className="w-4 h-4 text-[var(--accent-purple)]" />
            )}
            Appearance
          </CardTitle>
          <CardDescription>Customize how the application looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Theme</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Switch between light and dark mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                theme === 'dark'
                  ? 'bg-[var(--accent-purple)]'
                  : 'bg-stone-200 dark:bg-stone-700'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                  theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
                }`}
              >
                {theme === 'dark' ? (
                  <MoonIcon className="w-3 h-3 text-[var(--accent-purple)]" />
                ) : (
                  <SunIcon className="w-3 h-3 text-[var(--accent-amber)]" />
                )}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSignIcon className="w-4 h-4 text-[var(--accent-teal)]" />
            Currency
          </CardTitle>
          <CardDescription>
            Set the default currency for the organization.{' '}
            <span className="text-[var(--text-muted)]">(Admin only — affects all users)</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={currency}
            onValueChange={async (v) => {
              if (!v || v === currency) return;
              setCurrencySaving(true);
              try {
                await api.put('/settings/default_currency', { value: v });
                setCurrency(v);
                await refreshSettings();
              } catch {
                // toast is handled by api client
              } finally {
                setCurrencySaving(false);
              }
            }}
            disabled={currencySaving}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-md bg-stone-50 dark:bg-stone-900 px-4 py-3 border border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-muted)] mb-1">Preview</p>
            <p className="text-lg font-semibold text-[var(--text-primary)] font-[family-name:var(--font-mono)]">
              {formatCurrency(1234567)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="w-4 h-4 text-[var(--text-secondary)]" />
            Notifications
          </CardTitle>
          <CardDescription>Choose how you want to be notified.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Channel headers */}
          <div className="grid grid-cols-[1fr_60px_60px_60px] items-center gap-2 mb-3">
            <div />
            <div className="text-center">
              <MailIcon className="w-3.5 h-3.5 mx-auto text-[var(--text-muted)]" />
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Email</p>
            </div>
            <div className="text-center">
              <BellIcon className="w-3.5 h-3.5 mx-auto text-[var(--text-muted)]" />
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">In-App</p>
            </div>
            <div className="text-center">
              <MessageSquareIcon className="w-3.5 h-3.5 mx-auto text-[var(--text-muted)]" />
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Teams</p>
            </div>
          </div>

          <Separator className="mb-3" />

          <div className="space-y-0 divide-y divide-[var(--border-default)]">
            {notifications.map((pref, idx) => (
              <div
                key={pref.key}
                className="grid grid-cols-[1fr_60px_60px_60px] items-center gap-2 py-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 text-[var(--text-secondary)]">{pref.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{pref.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{pref.description}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Checkbox
                    checked={pref.email}
                    onChange={() => toggleNotification(idx, 'email')}
                  />
                </div>
                <div className="flex justify-center">
                  <Checkbox
                    checked={pref.inApp}
                    onChange={() => toggleNotification(idx, 'inApp')}
                  />
                </div>
                <div className="flex justify-center">
                  <Checkbox
                    checked={pref.teams}
                    onChange={() => toggleNotification(idx, 'teams')}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeIcon className="w-4 h-4 text-[var(--text-secondary)]" />
            Timezone
          </CardTitle>
          <CardDescription>Set your local timezone for accurate time tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-[var(--accent-amber)]" />
              Admin Actions
            </CardTitle>
            <CardDescription>Manual triggers for system operations. Alerts will be sent to Teams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Send Teams Alerts</p>
                <p className="text-xs text-[var(--text-muted)]">Send reminders, approval alerts, and weekly insights to Teams channel</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={sendingAlerts}
                onClick={async () => {
                  setSendingAlerts(true);
                  try {
                    const result = await api.post<{ timesheetReminders: number; approvalReminders: number; managerSummaries: number; weeklyInsights: number }>('/integrations/notifications/send', {});
                    toast.success(`Sent: ${result.timesheetReminders} reminders, ${result.managerSummaries} summaries, ${result.weeklyInsights} insights`);
                  } catch {
                    // toast handled by api client
                  } finally {
                    setSendingAlerts(false);
                  }
                }}
              >
                {sendingAlerts ? <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <SendIcon className="w-3.5 h-3.5 mr-1.5" />}
                {sendingAlerts ? 'Sending...' : 'Send Now'}
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Recalculate Budgets</p>
                <p className="text-xs text-[var(--text-muted)]">Recalculate actual costs and roll up through charge code hierarchy</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={recalculating}
                onClick={async () => {
                  setRecalculating(true);
                  try {
                    const result = await api.post<{ recalculated: number }>('/budgets/recalculate', {});
                    toast.success(`Recalculated ${result.recalculated} charge codes`);
                  } catch {
                    // toast handled by api client
                  } finally {
                    setRecalculating(false);
                  }
                }}
              >
                {recalculating ? <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5" />}
                {recalculating ? 'Calculating...' : 'Recalculate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} className="min-w-[120px]">
          {saved ? (
            <>
              <CheckIcon className="w-4 h-4 mr-1" />
              Saved
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
        checked
          ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)]'
          : 'border-[var(--border-default)] hover:border-stone-400 dark:hover:border-stone-500'
      }`}
    >
      {checked && <CheckIcon className="w-3 h-3 text-white" />}
    </button>
  );
}
