import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Copy,
  Instagram,
  MoreVertical,
  MousePointerClick,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Workflow,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { EmptyState, ErrorState, TableSkeleton } from '@/dashboard/widgets';
import { useApiQuery, useDebounce } from '@/hooks';
import { automationService, instagramService } from '@/services';
import { toast } from '@/components/ui/toaster';
import { cn, relativeTime } from '@/lib/utils';
import type { Automation, AutomationType, InstagramAccount } from '@/types';

const typeMeta: Record<AutomationType, { label: string; icon: typeof Zap; variant: 'default' | 'info' | 'success' | 'secondary' }> = {
  KEYWORD_DM: { label: 'Keyword DM', icon: Zap, variant: 'default' },
  COMMENT_DM: { label: 'Comment DM', icon: MousePointerClick, variant: 'info' },
  STORY_REPLY: { label: 'Story reply', icon: Sparkles, variant: 'secondary' },
  WELCOME_DM: { label: 'Welcome DM', icon: Sparkles, variant: 'success' },
  FOLLOW_DM: { label: 'Follow DM', icon: Instagram, variant: 'secondary' },
  WORKFLOW: { label: 'Workflow', icon: Workflow, variant: 'default' },
};

export default function AutomationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['automations', debouncedSearch, typeFilter],
    async () => {
      const response = await automationService.list({
        search: debouncedSearch || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        limit: 100,
      });
      return response.data.automations;
    },
  );

  useEffect(() => {
    document.title = 'Automations — Instaflow';
  }, []);

  const toggle = async (automation: Automation, isActive: boolean) => {
    try {
      await automationService.toggle(automation.id, isActive);
      toast.success(isActive ? 'Automation activated' : 'Automation paused');
      await refetch();
    } catch (err) {
      toast.error('Could not update the automation', { description: (err as Error).message });
    }
  };

  const duplicate = async (automation: Automation) => {
    try {
      await automationService.duplicate(automation.id);
      toast.success('Automation duplicated');
      await refetch();
    } catch (err) {
      toast.error('Could not duplicate', { description: (err as Error).message });
    }
  };

  const remove = async (automation: Automation) => {
    try {
      await automationService.remove(automation.id);
      toast.success('Automation deleted');
      await refetch();
    } catch (err) {
      toast.error('Could not delete', { description: (err as Error).message });
    }
  };

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Automations"
        description="Create keyword replies, comment-to-DM flows and multi-step workflows."
        actions={
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New automation
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search automations…"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-[220px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(typeMeta).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <TableSkeleton rows={5} columns={4} />
        </Card>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Workflow}
          title={search || typeFilter !== 'all' ? 'No automations match your filters' : 'No automations yet'}
          description={
            search || typeFilter !== 'all'
              ? 'Try a different search term or clear the filter.'
              : 'Create your first keyword automation and Instaflow will reply to matching DMs automatically.'
          }
          action={
            !search && typeFilter === 'all' ? (
              <Button variant="gradient" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Create automation
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {data?.map((automation) => {
            const meta = typeMeta[automation.type] ?? typeMeta.KEYWORD_DM;
            const Icon = meta.icon;
            const account =
              typeof automation.instagramAccount === 'string'
                ? undefined
                : automation.instagramAccount;

            return (
              <Card key={automation.id} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        automation.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/dashboard/automations/${automation.id}`}
                          className="truncate font-semibold transition-colors hover:text-primary"
                        >
                          {automation.name}
                        </Link>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        {automation.collectLead && <Badge variant="success">Lead capture</Badge>}
                        {!automation.isActive && <Badge variant="secondary">Paused</Badge>}
                      </div>

                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {automation.description ||
                          automation.message ||
                          'No reply message configured yet'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {account && <span>@{account.username}</span>}
                        <span>
                          {automation.stats?.triggered ?? 0} triggered ·{' '}
                          {automation.stats?.succeeded ?? 0} succeeded
                        </span>
                        {automation.stats?.leads ? (
                          <span>{automation.stats.leads} leads</span>
                        ) : null}
                        <span>Created {relativeTime(automation.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={(checked) => void toggle(automation, checked)}
                        aria-label="Toggle automation"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/automations/${automation.id}`)}
                      >
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void duplicate(automation)}>
                            <Copy /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void remove(automation)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateAutomationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(automation) => {
          setCreateOpen(false);
          navigate(`/dashboard/automations/${automation.id}`);
        }}
      />
    </>
  );
}

function CreateAutomationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (automation: Automation) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AutomationType>('KEYWORD_DM');
  const [accountId, setAccountId] = useState('');
  const [keywords, setKeywords] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: accounts } = useApiQuery(
    ['instagram-accounts', 'picker'],
    async () => {
      const response = await instagramService.accounts();
      return response.data.accounts;
    },
    { enabled: open },
  );

  const parsedKeywords = useMemo(
    () =>
      keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    [keywords],
  );

  useEffect(() => {
    if (accounts?.length && !accountId) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await automationService.create({
        name,
        type,
        instagramAccountId: accountId,
        isActive: false,
        message,
        triggers: [
          {
            type: type === 'COMMENT_DM' ? 'COMMENT' : 'KEYWORD',
            enabled: true,
            keywords: parsedKeywords,
            matchType: 'PARTIAL',
            caseSensitive: false,
            mediaIds: [],
            storyIds: [],
            delaySeconds: 2,
          },
        ],
      });
      toast.success('Automation created');
      onCreated(response.data.automation);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New automation</DialogTitle>
          <DialogDescription>
            Start with a keyword or comment trigger — you can fine-tune everything in the builder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="automation-name">Name</Label>
            <Input
              id="automation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pricing keyword reply"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as AutomationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeMeta).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Instagram account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((account: InstagramAccount) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(accounts?.length ?? 0) === 0 && (
                <p className="text-xs text-warning">
                  Connect an Instagram account first.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="automation-keywords">
              {type === 'COMMENT_DM' ? 'Trigger keywords (comma separated)' : 'Keywords (comma separated)'}
            </Label>
            <Input
              id="automation-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="PRICE, pricing, costs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="automation-message">Reply message</Label>
            <Textarea
              id="automation-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Thanks for your interest! Here is our pricing link."
            />
            <p className="text-xs text-muted-foreground">
              Use {'{{username}}'} and {'{{keyword}}'} to personalise the reply.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleCreate}
            loading={loading}
            disabled={!name || !accountId}
          >
            Create automation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
