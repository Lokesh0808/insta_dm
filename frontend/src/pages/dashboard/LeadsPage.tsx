import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Filter,
  Mail,
  Phone,
  Search,
  Tag,
  Target,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState, ErrorState, TableSkeleton } from '@/dashboard/widgets';
import { useApiQuery, useDebounce } from '@/hooks';
import { leadService } from '@/services';
import { API_URL, tokenStorage } from '@/services/api';
import { toast } from '@/components/ui/toaster';
import { formatDateTime } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/types';

const STATUS_VARIANTS: Record<LeadStatus, 'default' | 'info' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  new: 'default',
  contacted: 'info',
  qualified: 'success',
  converted: 'success',
  unqualified: 'warning',
  lost: 'destructive',
};

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['leads', debouncedSearch, status, source, page],
    async () => {
      const response = await leadService.list({
        search: debouncedSearch || undefined,
        status: status !== 'all' ? status : undefined,
        source: source !== 'all' ? source : undefined,
        page,
        limit: 25,
      });
      return response.data;
    },
  );

  useEffect(() => {
    document.title = 'Leads — Instaflow';
  }, []);

  const exportCsv = async () => {
    try {
      const response = await fetch(
        `${API_URL}/leads/export?${new URLSearchParams({
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(status !== 'all' ? { status } : {}),
          ...(source !== 'all' ? { source } : {}),
        })}`,
        {
          headers: {
            Authorization: `Bearer ${tokenStorage.getAccess() ?? ''}`,
          },
        },
      );
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `instaflow-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Leads exported');
    } catch (err) {
      toast.error('Could not export leads', { description: (err as Error).message });
    }
  };

  const remove = async (lead: Lead) => {
    try {
      await leadService.remove(lead.id);
      toast.success('Lead deleted');
      await refetch();
    } catch (err) {
      toast.error('Could not delete the lead', { description: (err as Error).message });
    }
  };

  const updateLead = async (id: string, payload: Record<string, unknown>) => {
    try {
      await leadService.update(id, payload);
      toast.success('Lead updated');
      await refetch();
      setSelected(null);
    } catch (err) {
      toast.error('Could not update the lead', { description: (err as Error).message });
    }
  };

  const meta = data?.meta;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every person who interacted with your automations, captured automatically."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username, name, email or phone…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="lg:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(STATUS_VARIANTS).map((value) => (
              <SelectItem key={value} value={value} className="capitalize">
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={source}
          onValueChange={(value) => {
            setSource(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="lg:w-[200px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="keyword_dm">Keyword DM</SelectItem>
            <SelectItem value="comment_dm">Comment DM</SelectItem>
            <SelectItem value="story_reply">Story reply</SelectItem>
            <SelectItem value="welcome_dm">Welcome DM</SelectItem>
            <SelectItem value="follow">Follow</SelectItem>
            <SelectItem value="workflow">Workflow</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton rows={6} columns={6} />
            ) : (data?.leads?.length ?? 0) === 0 ? (
              <EmptyState
                icon={Target}
                title="No leads captured yet"
                description="Enable lead capture on an automation and every new contact is added here automatically."
                className="m-6 border-none"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.leads?.map((lead: Lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <button
                          onClick={() => setSelected(lead)}
                          className="font-medium transition-colors hover:text-primary"
                        >
                          @{lead.igUsername}
                        </button>
                        {lead.name && (
                          <p className="text-xs text-muted-foreground">{lead.name}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-sm">
                          {lead.email && (
                            <p className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {lead.email}
                            </p>
                          )}
                          {lead.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {lead.phone}
                            </p>
                          )}
                          {!lead.email && !lead.phone && (
                            <span className="text-xs text-muted-foreground">Not provided</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {lead.source.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[lead.status]} className="capitalize">
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags?.length ? (
                            lead.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="gap-1 text-[10px]">
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(lead.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <Filter className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelected(lead)}>
                              <UserPlus /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void remove(lead)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} leads
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPrev}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNext}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <LeadDetailDialog
        lead={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onUpdate={updateLead}
      />
    </>
  );
}

function LeadDetailDialog({
  lead,
  onOpenChange,
  onUpdate,
}: {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [status, setStatus] = useState<LeadStatus>('new');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setStatus(lead.status);
    setTags(lead.tags?.join(', ') ?? '');
    setNotes(lead.notes ?? '');
    setEmail(lead.email ?? '');
    setPhone(lead.phone ?? '');
  }, [lead]);

  const save = async () => {
    if (!lead) return;
    setSaving(true);
    await onUpdate(lead.id, {
      status,
      notes,
      email: email || undefined,
      phone: phone || undefined,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setSaving(false);
  };

  return (
    <Dialog open={Boolean(lead)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>@{lead?.igUsername}</DialogTitle>
          <DialogDescription>
            Captured via {lead?.source.replace('_', ' ')} on {lead?.createdAt ? formatDateTime(lead.createdAt) : '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="volunteered by the lead"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="volunteered by the lead"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as LeadStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STATUS_VARIANTS).map((value) => (
                  <SelectItem key={value} value={value} className="capitalize">
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-tags">Tags</Label>
            <Input
              id="lead-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hot-lead, website"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for your team…"
            />
          </div>

          {lead?.profileSnapshot && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Profile snapshot</p>
              {lead.profileSnapshot.followersCount !== undefined && (
                <p className="mt-1">Followers: {lead.profileSnapshot.followersCount}</p>
              )}
              {lead.profileSnapshot.biography && (
                <p className="mt-1 line-clamp-3">Bio: {lead.profileSnapshot.biography}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="gradient" loading={saving} onClick={save}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
