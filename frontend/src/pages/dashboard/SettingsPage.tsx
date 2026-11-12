import { useEffect, useState } from 'react';
import {
  Bell,
  KeyRound,
  Laptop,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/store/theme.store';
import { authService } from '@/services';
import { toast } from '@/components/ui/toaster';
import { formatDateTime, relativeTime } from '@/lib/utils';

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    document.title = 'Settings — Instaflow';
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? '');
    }
  }, [user]);

  useEffect(() => {
    authService
      .listSessions()
      .then((response) => setSessions(response.data.sessions))
      .catch(() => undefined);
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ name, phone: phone || undefined });
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Could not save your profile', { description: (err as Error).message });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    setChangingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success('Password changed — please sign in again');
      await logout();
      window.location.href = '/login';
    } catch (err) {
      toast.error('Could not change your password', { description: (err as Error).message });
    } finally {
      setChangingPassword(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await authService.revokeSession(id);
      setSessions((current) => current.filter((session) => session.id !== id));
      toast.success('Session revoked');
    } catch (err) {
      toast.error('Could not revoke the session', { description: (err as Error).message });
    }
  };

  const preferences = user?.preferences;

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, security and preferences." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-1.5 h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-1.5 h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-1.5 h-3.5 w-3.5" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Profile information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Full name</Label>
                <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email</Label>
                <Input id="settings-email" value={user?.email ?? ''} disabled />
                <p className="text-xs text-muted-foreground">
                  Contact support to change the email on your account.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-phone">Phone (optional)</Label>
                <Input
                  id="settings-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <Button variant="gradient" loading={savingProfile} onClick={saveProfile}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters, mixed case and a number"
                  />
                </div>
                <Button
                  variant="gradient"
                  loading={changingPassword}
                  onClick={changePassword}
                  disabled={!currentPassword || !newPassword}
                >
                  <KeyRound className="h-4 w-4" /> Update password
                </Button>
                <p className="text-xs text-muted-foreground">
                  Changing your password signs you out of every device.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No other active sessions.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {sessions.map((session) => (
                      <li key={String(session.id)} className="flex items-center gap-3 py-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {String(session.userAgent ?? 'Unknown device').slice(0, 48)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.ipAddress ? `${session.ipAddress} · ` : ''}
                            {session.lastUsedAt ? relativeTime(session.lastUsedAt as string) : 'now'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => void revokeSession(String(session.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Colour theme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Laptop },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-colors ${
                      theme === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <option.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                label="Email notifications"
                description="Billing receipts and account updates."
                checked={preferences?.notifications.email ?? true}
                onChange={() =>
                  updateProfile({
                    preferences: { notifications: { email: !(preferences?.notifications.email ?? true) } },
                  }).catch(() => toast.error('Could not save preferences'))
                }
              />
              <ToggleRow
                label="In-app notifications"
                description="Real-time alerts inside the dashboard."
                checked={preferences?.notifications.inApp ?? true}
                onChange={() =>
                  updateProfile({
                    preferences: { notifications: { inApp: !(preferences?.notifications.inApp ?? true) } },
                  }).catch(() => toast.error('Could not save preferences'))
                }
              />
              <ToggleRow
                label="Lead alerts"
                description="Get notified when a new lead is captured."
                checked={preferences?.notifications.leadAlerts ?? true}
                onChange={() =>
                  updateProfile({
                    preferences: {
                      notifications: { leadAlerts: !(preferences?.notifications.leadAlerts ?? true) },
                    },
                  }).catch(() => toast.error('Could not save preferences'))
                }
              />
              <ToggleRow
                label="Usage alerts"
                description="Warn me when I am close to a plan limit."
                checked={preferences?.notifications.usageAlerts ?? true}
                onChange={() =>
                  updateProfile({
                    preferences: {
                      notifications: {
                        usageAlerts: !(preferences?.notifications.usageAlerts ?? true),
                      },
                    },
                  }).catch(() => toast.error('Could not save preferences'))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
      <div className="pr-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
