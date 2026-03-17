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
} from 'lucide-react';

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

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [defaultView, setDefaultView] = useState<'weekly' | 'bi-weekly'>('weekly');
  const [timezone, setTimezone] = useState('Asia/Bangkok');
  const [saved, setSaved] = useState(false);

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

      {/* Default View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[var(--text-secondary)]" />
            Default View
          </CardTitle>
          <CardDescription>Choose your preferred timesheet view.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => setDefaultView('weekly')}
              className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                defaultView === 'weekly'
                  ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-light)] dark:bg-[var(--accent-teal)]/10'
                  : 'border-[var(--border-default)] hover:border-stone-300 dark:hover:border-stone-600'
              }`}
            >
              <div className={`text-sm font-medium ${
                defaultView === 'weekly' ? 'text-[var(--accent-teal)]' : 'text-[var(--text-primary)]'
              }`}>
                Weekly
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">7-day view</p>
              {defaultView === 'weekly' && (
                <CheckIcon className="w-4 h-4 text-[var(--accent-teal)] mx-auto mt-2" />
              )}
            </button>
            <button
              onClick={() => setDefaultView('bi-weekly')}
              className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                defaultView === 'bi-weekly'
                  ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-light)] dark:bg-[var(--accent-teal)]/10'
                  : 'border-[var(--border-default)] hover:border-stone-300 dark:hover:border-stone-600'
              }`}
            >
              <div className={`text-sm font-medium ${
                defaultView === 'bi-weekly' ? 'text-[var(--accent-teal)]' : 'text-[var(--text-primary)]'
              }`}>
                Bi-Weekly
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">14-day view</p>
              {defaultView === 'bi-weekly' && (
                <CheckIcon className="w-4 h-4 text-[var(--accent-teal)] mx-auto mt-2" />
              )}
            </button>
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
