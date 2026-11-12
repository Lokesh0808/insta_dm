import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/store/theme.store';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
];

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive && location.pathname === link.to && 'bg-accent text-accent-foreground',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {isAuthenticated ? (
              <Button asChild variant="gradient" size="sm">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild variant="gradient" size="sm">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex items-center justify-between">
                  <Logo />
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="mt-6 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto flex flex-col gap-2">
                  <Button asChild variant="gradient">
                    <Link to="/register">Get started free</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/login">Sign in</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 bg-muted/30">
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                Automate Instagram DMs, comments, lead collection and marketing workflows —
                powered by the official Meta Graph API.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/features" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-foreground">
                    Get started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/privacy" className="hover:text-foreground">
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-foreground">
                    Terms of service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Instaflow. Built on the official Instagram Platform.
            </p>
            <p className="text-xs text-muted-foreground">
              Not affiliated with Meta. Instagram™ is a trademark of Meta Platforms, Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
