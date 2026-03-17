'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Clock,
  Tag,
  CheckCircle,
  BarChart3,
  DollarSign,
  Users,
  CalendarDays,
  Settings,
  Menu,
  Bell,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/time-entry', label: 'Time Entry', icon: Clock },
  { href: '/charge-codes', label: 'Charge Codes', icon: Tag },
  { href: '/approvals', label: 'Approvals', icon: CheckCircle },
];

const insightNavItems = [
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/budget', label: 'Budget', icon: DollarSign },
];

const adminNavItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/admin/rates', label: 'Rates', icon: Settings },
];

const mobileNavItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/time-entry', label: 'Time', icon: Clock },
  { href: '/charge-codes', label: 'Codes', icon: Tag },
  { href: '/approvals', label: 'Approve', icon: CheckCircle },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (typeof window !== 'undefined' && !supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  useEffect(() => {
    const checkViewport = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1280);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    if (isTablet) setSidebarCollapsed(true);
    if (!isTablet && !isMobile) setSidebarCollapsed(false);
  }, [isTablet, isMobile]);

  const handleLogout = async () => {
    await supabaseRef.current?.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const pageTitle = () => {
    const allItems = [...mainNavItems, ...insightNavItems, ...adminNavItems];
    const current = allItems.find((item) => isActive(item.href));
    return current?.label || 'Dashboard';
  };

  const breadcrumb = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    return segments.map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '));
  };

  const collapsed = sidebarCollapsed || isTablet;

  return (
    <div className="flex h-screen bg-[var(--bg-content)]">
      {/* Sidebar - hidden on mobile */}
      {!isMobile && (
        <aside
          className={`${
            collapsed ? 'w-16' : 'w-60'
          } bg-[#0F172A] text-white flex flex-col transition-all duration-200 ease-in-out shrink-0`}
        >
          {/* Logo */}
          <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-700/50">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              TS
            </div>
            {!collapsed && (
              <span className="font-semibold text-sm tracking-tight font-[family-name:var(--font-heading)]">
                Timesheet
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto">
            {!collapsed && (
              <p className="px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Main
              </p>
            )}
            {mainNavItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}

            <Separator className="my-3 bg-slate-700/50" />

            {!collapsed && (
              <p className="px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Insight
              </p>
            )}
            {insightNavItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}

            <Separator className="my-3 bg-slate-700/50" />

            {!collapsed && (
              <p className="px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Admin
              </p>
            )}
            {adminNavItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50 space-y-2">
            {!collapsed ? (
              <>
                <a
                  href="#"
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Help & Support
                </a>
                <Badge
                  variant="secondary"
                  className="bg-slate-800 text-slate-400 text-[10px]"
                >
                  v1.0.0
                </Badge>
              </>
            ) : (
              <div className="flex justify-center">
                <HelpCircle className="w-4 h-4 text-slate-500 hover:text-white cursor-pointer transition-colors" />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-[#1C1917] border-b border-[var(--border-default)] flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {!isMobile && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--text-primary)] font-[family-name:var(--font-heading)]">
                {pageTitle()}
              </h1>
              {breadcrumb() && breadcrumb()!.length > 1 && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  {breadcrumb()!.map((seg, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="w-3 h-3" />}
                      <span>{seg}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 relative transition-colors" aria-label="Notifications (3 unread)">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--accent-red)] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 cursor-pointer" suppressHydrationWarning>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-teal-600 text-white text-xs font-medium">
                    U
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content with fade-in animation */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in" key={pathname}>
          {children}
        </main>
      </div>

      {/* Mobile bottom tab navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#1C1917] border-t border-[var(--border-default)] flex items-center justify-around z-40">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 ${
                  active
                    ? 'text-[var(--accent-teal)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors relative ${
        active
          ? 'text-white bg-slate-800/60 font-semibold'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
      }`}
      title={collapsed ? label : undefined}
    >
      {active && (
        <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-teal-500" />
      )}
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
