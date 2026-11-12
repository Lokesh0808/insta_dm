import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  Gauge,
  LogOut,
  Moon,
  Server,
  Shield,
  Sun,
  Users,
} from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { cn, initials } from '@/lib/utils';

const adminNav = [
  { to: '/admin', label: 'Overview', icon: Gauge, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/payments', label: 'Payments', icon: Activity },
  { to: '/admin/system', label: 'System monitoring', icon: Server },
];

export function AdminLayout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[264px] shrink-0 border-r border-border/60 bg-sidebar lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="flex h-16 items-center gap-2 px-5">
            <Logo />
            <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
              Admin
            </span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-2">
            {adminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Separator />

          <div className="space-y-1 px-3 py-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Gauge className="h-4.5 w-4.5" /> Back to dashboard
            </Link>
            <button
              onClick={toggle}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              Toggle theme
            </button>
            <button
              onClick={() => void logout().then(() => (window.location.href = '/login'))}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4.5 w-4.5" /> Sign out
            </button>
          </div>

          <div className="border-t border-border/60 p-3">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <Avatar className="h-8 w-8">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name ?? ''} />}
                <AvatarFallback>{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" /> {user?.platformRole}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/85 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Platform administration</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard">Exit admin</Link>
          </Button>
        </header>
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
