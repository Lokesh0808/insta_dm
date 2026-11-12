import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Instagram,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Trash2,
  Unplug,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState, ErrorState } from '@/dashboard/widgets';
import { useApiQuery, useAsync } from '@/hooks';
import { instagramService } from '@/services';
import { toast } from '@/components/ui/toaster';
import { formatNumber, relativeTime } from '@/lib/utils';
import type { InstagramAccount } from '@/types';

export default function InstagramAccountsPage() {
  const [selected, setSelected] = useState<InstagramAccount | null>(null);
  const [connecting, setConnecting] = useState(false);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['instagram-accounts'],
    async () => {
      const response = await instagramService.accounts();
      return response.data.accounts;
    },
  );

  useEffect(() => {
    document.title = 'Instagram accounts — Instaflow';
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      toast.error('Instagram connection failed', {
        description: params.get('message') ?? 'Please try again.',
      });
      window.history.replaceState({}, '', '/dashboard/instagram');
    }
    if (params.get('connected')) {
      toast.success('Instagram connected', {
        description: `${params.get('connected')} account(s) added to your workspace.`,
      });
      window.history.replaceState({}, '', '/dashboard/instagram');
      void refetch();
    }
  }, [refetch]);

  const connect = async () => {
    setConnecting(true);
    try {
      const response = await instagramService.connect();
      window.location.href = response.data.url;
    } catch (err) {
      toast.error('Could not start the connection', { description: (err as Error).message });
      setConnecting(false);
    }
  };

  const sync = useAsync(
    async (id: string) => {
      await instagramService.sync(id);
      toast.success('Account synced');
      await refetch();
    },
    [refetch],
  );

  const disconnect = async (id: string, username: string) => {
    try {
      await instagramService.remove(id);
      toast.success(`${username} disconnected`);
      await refetch();
    } catch (err) {
      toast.error('Could not disconnect', { description: (err as Error).message });
    }
  };

  const togglePause = async (account: InstagramAccount, paused: boolean) => {
    try {
      await instagramService.updateSettings(account.id, { pauseAutomations: paused });
      toast.success(paused ? 'Automations paused' : 'Automations resumed');
      await refetch();
    } catch (err) {
      toast.error('Could not update settings', { description: (err as Error).message });
    }
  };

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Instagram accounts"
        description="Connect Instagram Professional accounts (Business or eligible Creator) to automate DMs and comments."
        actions={
          <Button variant="gradient" onClick={connect} loading={connecting}>
            <Instagram className="h-4 w-4" /> Connect Instagram
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 p-5">
                <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Instagram}
          title="No Instagram accounts connected"
          description="Connect an Instagram Professional account through Meta's secure OAuth flow. Your access token is encrypted on the server and never exposed to the browser."
          action={
            <Button variant="gradient" onClick={connect} loading={connecting}>
              <Plus className="h-4 w-4" /> Connect Instagram
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((account) => (
            <Card key={account.id} className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 rounded-xl">
                    {account.profilePictureUrl && (
                      <AvatarImage src={account.profilePictureUrl} alt={account.username} />
                    )}
                    <AvatarFallback className="rounded-xl">
                      {account.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">@{account.username}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {account.name ?? 'Instagram Professional account'}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void sync.execute(account.id)}>
                        <RefreshCw /> Sync profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void disconnect(account.id, account.username)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 /> Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                  <div>
                    <p className="text-sm font-bold">{formatNumber(account.followersCount)}</p>
                    <p className="text-[11px] text-muted-foreground">Followers</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{formatNumber(account.followsCount)}</p>
                    <p className="text-[11px] text-muted-foreground">Following</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{formatNumber(account.mediaCount)}</p>
                    <p className="text-[11px] text-muted-foreground">Posts</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {account.connectionStatus === 'connected' ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> {account.connectionStatus}
                    </Badge>
                  )}
                  <Badge variant="secondary">{account.accountType}</Badge>
                  {account.token?.scopes?.includes('instagram_manage_messages') && (
                    <Badge variant="info">messaging</Badge>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                  <div>
                    <Label htmlFor={`pause-${account.id}`} className="text-sm">
                      Pause automations
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Synced {relativeTime(account.lastSyncedAt ?? account.connectedAt)}
                    </p>
                  </div>
                  <Switch
                    id={`pause-${account.id}`}
                    checked={account.settings?.pauseAutomations ?? false}
                    onCheckedChange={(checked) => void togglePause(account, checked)}
                  />
                </div>

                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link to="/dashboard/automations">
                    Manage automations <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account details</DialogTitle>
            <DialogDescription>Token and permission metadata for this connection.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instagram user ID</span>
                <span className="font-mono text-xs">{selected.igUserId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token expiry</span>
                <span>{selected.token?.expiresAt ? new Date(selected.token.expiresAt).toLocaleString() : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token type</span>
                <span>{selected.token?.type ?? '—'}</span>
              </div>
              <div>
                <p className="mb-2 text-muted-foreground">Granted scopes</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.token?.scopes?.length ? (
                    selected.token.scopes.map((scope) => (
                      <Badge key={scope} variant="secondary" className="font-mono text-[10px]">
                        {scope}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None reported</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
