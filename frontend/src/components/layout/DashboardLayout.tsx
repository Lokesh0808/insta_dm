import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  Instagram,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Target,
  Workflow,
} from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { getSocket } from '@/services/socket';
import { cn, initials, relativeTime } from '@/lib/utils';
import type { ReactNode } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  end?: boolean;
}

const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/instagram', label: 'Instagram accounts', icon: Instagram },
  { to: '/dashboard/automations', label: 'Automations', icon: Workflow },
  { to: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/dashboard/leads', label: 'Leads', icon: Target },
  { to: '/dashboard/link-in-bio', label: 'Link-in-bio', icon: Sparkles },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

const secondaryNav: NavItem[] = [
  { to: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuthStore();

  const renderItem = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={cn(
              'h-4.5 w-4.5 shrink-0 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="text-[10px]">
              {item.badge}
            </Badge>
          )}
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-2">
          {mainNav.map(renderItem)}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {secondaryNav.map(renderItem)}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 p-3">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-chart-5/10 p-3">
          <p className="text-xs font-semibold">Need more automation?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upgrade to unlock unlimited automations and advanced reporting.
          </p>
          <Button asChild size="sm" variant="gradient" className="mt-2.5 w-full">
            <Link to="/dashboard/subscription" onClick={onNavigate}>
              View plans
            </Link>
          </Button>
        </div>

        {user && (
          <div className="mt-3 flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar className="h-8 w-8">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, fetch, markRead, markAllRead } = useNotificationStore();
  const location = useLocation();

  useEffect(() => {
    void fetch();
    const socket = getSocket();
    socket.on('notification:new', (notification: any) => {
      useNotificationStore.getState().push(notification);
    });
    return () => {
      socket.off('notification:new');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageTitle = useMemo(() => {
    const item = [...mainNav, ...secondaryNav].find((nav) =>
      nav.end ? location.pathname === nav.to : location.pathname.startsWith(nav.to),
    );
    return item?.label ?? 'Dashboard';
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden w-[264px] shrink-0 border-r border-border/60 bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* ---------- Mobile sidebar ---------- */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-4 top-4 z-40 bg-background/90 backdrop-blur lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ---------- Main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 pl-12 lg:pl-0">
            <h1 className="truncate text-base font-semibold tracking-tight lg:text-lg">
              {pageTitle}
            </h1>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[340px]">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm font-medium">No notifications yet</p>
                    <p className="text-xs text-muted-foreground">
                      Activity from your automations will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => void markRead(notification.id)}
                        className={cn(
                          'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                          !notification.readAt && 'bg-primary/[0.04]',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{notification.title}</p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {relativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Toggle colour theme"
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-accent">
                <Avatar className="h-8 w-8 ring-2 ring-transparent transition-all hover:ring-primary/30">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback>{initials(user?.name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings">
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/subscription">
                  <CreditCard /> Subscription
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void logout().then(() => {
                    window.location.href = '/login';
                  });
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function HomeLink() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Home className="h-4 w-4" /> Dashboard
    </Link>
  );
}
