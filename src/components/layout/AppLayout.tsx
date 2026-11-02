import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Building,
  Building2,
  FlaskConical,
  Pill,
  Radio,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  LogOut,
  Menu,
  MessageSquare,
  Video,
  Activity,
  Shield,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Notification } from '@/types/dhos';
import { canAccessRoute } from '@/lib/access';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
  notifications: Notification[];
  onLogout: () => void;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/appointments', icon: Calendar, label: 'Appointments' },
  { path: '/clinical', icon: Stethoscope, label: 'Clinical' },
  { path: '/inpatient', icon: Building, label: 'In-Patient' },
  { path: '/laboratory', icon: FlaskConical, label: 'Laboratory' },
  { path: '/pharmacy', icon: Pill, label: 'Pharmacy' },
  { path: '/radiology', icon: Radio, label: 'Radiology' },
  { path: '/billing', icon: CreditCard, label: 'Billing' },
  { path: '/operations', icon: Gauge, label: 'Operations' },
  { path: '/telemedicine', icon: Video, label: 'Telemedicine' },
  { path: '/monitoring', icon: Activity, label: 'RPM Monitor' },
  { path: '/credentials', icon: Shield, label: 'Credentials' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/hospitals', icon: Building2, label: 'Hospitals' },
  { path: '/vendors', icon: Building2, label: 'Vendors' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const navGroups = [
  { label: 'Overview', paths: ['/dashboard'] },
  { label: 'Care delivery', paths: ['/patients', '/appointments', '/clinical', '/inpatient', '/telemedicine', '/monitoring'] },
  { label: 'Diagnostics', paths: ['/laboratory', '/pharmacy', '/radiology'] },
  { label: 'Administration', paths: ['/billing', '/operations', '/credentials', '/messages'] },
  { label: 'Network', paths: ['/hospitals', '/vendors'] },
  { label: 'System', paths: ['/settings'] },
];

export function AppLayout({ children, user, notifications, onLogout }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredNavItems = navItems.filter((item) => canAccessRoute(user.role, item.path));
  const visibleGroups = navGroups
    .map((group) => ({
      label: group.label,
      items: filteredNavItems.filter((item) => group.paths.includes(item.path)),
    }))
    .filter((group) => group.items.length > 0);

  const activeItem = navItems.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/'),
  );

  const canSearchPatients = canAccessRoute(user.role, '/patients');

  // Notifications that point at an area this role cannot open are hidden, not
  // just un-linked, so restricted titles never surface in the header.
  const visibleNotifications = notifications.filter(
    (notification) => !notification.actionUrl || canAccessRoute(user.role, notification.actionUrl),
  );
  const unreadNotifications = visibleNotifications.filter((n) => !n.read && !readIds.has(n.id)).length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !typing && canSearchPatients) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canSearchPatients]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/patients?q=${encodeURIComponent(query)}`);
  };

  const markAllRead = () => setReadIds(new Set(visibleNotifications.map((n) => n.id)));

  const notificationDot: Record<Notification['type'], string> = {
    alert: 'bg-destructive',
    warning: 'bg-warning',
    info: 'bg-primary',
    success: 'bg-stable',
  };

  const isItemActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-all duration-300 lg:flex',
          sidebarCollapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'w-full justify-center')}>
            <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <img
                src="/assets/Untitled-1.png"
                alt="Trika Health"
                className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
              />
              <span aria-hidden className="absolute -inset-1 rounded-2xl bg-sidebar-primary/20 blur-md" />
            </span>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">TRIKA</h1>
                <p className="truncate text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/50">
                  Health system
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-3 py-5">
          <TooltipProvider delayDuration={200}>
            {visibleGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                {sidebarCollapsed ? (
                  <div className="mx-auto mb-2 h-px w-8 bg-sidebar-border" aria-hidden />
                ) : (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/35">
                    {group.label}
                  </p>
                )}

                {group.items.map((item) => {
                  const active = isItemActive(item.path);
                  const link = (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                        active
                          ? 'bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/[0.04] font-semibold text-sidebar-primary'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        sidebarCollapsed && 'justify-center px-2',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-all duration-300',
                          active ? 'opacity-100' : 'scale-y-0 opacity-0',
                        )}
                      />
                      <item.icon
                        className={cn(
                          'h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105',
                          active && 'drop-shadow-[0_0_8px_hsl(var(--sidebar-primary)/0.5)]',
                        )}
                      />
                      {!sidebarCollapsed && (
                        <span className="truncate text-sm font-medium transition-transform duration-200 group-hover:translate-x-0.5">
                          {item.label}
                        </span>
                      )}
                      {!sidebarCollapsed && active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" aria-hidden />
                      )}
                    </NavLink>
                  );

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return link;
                })}
              </div>
            ))}
          </TooltipProvider>
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-3">
          <div className={cn('flex items-center gap-3 rounded-xl p-2', sidebarCollapsed && 'justify-center')}>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-primary to-[hsl(174_50%_38%)] text-sm font-semibold text-sidebar-primary-foreground shadow-inner">
              {user.name.split(' ').map((part) => part[0]).join('')}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
                <p className="truncate text-xs capitalize text-sidebar-foreground/55">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:bg-muted"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </aside>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-foreground/45 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden
      />

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3">
            <img src="/assets/Untitled-1.png" alt="Trika Health" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">TRIKA</h1>
              <p className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/50">Health system</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-sidebar-foreground/70 transition hover:bg-sidebar-accent"
            aria-label="Close navigation menu"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/35">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isItemActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                      active
                        ? 'bg-sidebar-primary/15 font-semibold text-sidebar-primary'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent',
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div
        className={cn(
          'relative isolate flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-64',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_560px_at_2%_-12%,hsl(198_85%_72%/0.45),transparent_58%),radial-gradient(820px_520px_at_100%_-8%,hsl(172_72%_62%/0.4),transparent_60%),radial-gradient(900px_600px_at_12%_62%,hsl(190_80%_72%/0.22),transparent_64%),radial-gradient(820px_560px_at_92%_82%,hsl(215_85%_74%/0.22),transparent_64%),linear-gradient(165deg,hsl(198_80%_94%),hsl(180_55%_96%)_42%,hsl(215_65%_95%))]"
        />
        <header className="sticky top-0 z-30 border-b border-white/50 bg-card/55 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10">
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {activeItem?.label ?? 'Workspace'}
                </p>
                <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                  {format(new Date(), 'EEEE, d MMMM yyyy')} · {user.department}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canSearchPatients && (
                <form onSubmit={handleSearch} className="group relative hidden sm:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search patients by name or UPID…"
                    aria-label="Search patients"
                    className="h-10 w-56 rounded-xl border-transparent bg-muted/60 pl-10 pr-10 text-sm transition-all duration-200 focus-visible:w-72 focus-visible:border-primary/40 focus-visible:bg-card lg:w-72 lg:focus-visible:w-80"
                  />
                  <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground group-focus-within:opacity-0 md:block">
                    /
                  </kbd>
                </form>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-xl"
                    aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-destructive/50" />
                        <span className="relative">{unreadNotifications}</span>
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 overflow-hidden p-0 shadow-xl">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unreadNotifications > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs font-medium text-primary-strong hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {visibleNotifications.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
                    ) : (
                      visibleNotifications.map((notification) => {
                        const isUnread = !notification.read && !readIds.has(notification.id);
                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              setReadIds((prev) => new Set(prev).add(notification.id));
                              if (notification.actionUrl) navigate(notification.actionUrl);
                            }}
                            className={cn(
                              'w-full border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60',
                              isUnread && 'bg-primary/[0.04]',
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', notificationDot[notification.type])} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-snug">{notification.title}</p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground/70">
                                  {format(new Date(notification.timestamp), 'dd MMM yyyy, HH:mm')}
                                </p>
                              </div>
                              {isUnread && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-strong">New</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="ml-1 hidden items-center gap-3 border-l border-border pl-3 sm:flex">
                <div className="text-right">
                  <p className="text-sm font-medium leading-tight">{user.name}</p>
                  <p className="text-[11px] capitalize text-muted-foreground">{user.department}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[hsl(174_50%_42%)] text-sm font-semibold text-primary-foreground">
                  {user.name.split(' ').map((part) => part[0]).join('')}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="hidden rounded-xl lg:flex"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 pb-24 lg:p-6">
          <div key={location.pathname} className="page-enter mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
