import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ExternalLink,
  Eye,
  Link2,
  MousePointerClick,
  Palette,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { EmptyState, ErrorState } from '@/dashboard/widgets';
import { useApiQuery } from '@/hooks';
import { linkInBioService } from '@/services';
import { toast } from '@/components/ui/toaster';
import { cn, formatNumber } from '@/lib/utils';
import type { LinkInBioPage } from '@/types';

const templates = [
  { value: 'minimal', label: 'Minimal', preview: 'from-slate-900 to-slate-800' },
  { value: 'gradient', label: 'Gradient', preview: 'from-indigo-600 via-purple-600 to-pink-500' },
  { value: 'cards', label: 'Cards', preview: 'from-slate-800 to-slate-900' },
  { value: 'glass', label: 'Glass', preview: 'from-indigo-900 via-slate-900 to-purple-900' },
  { value: 'sunset', label: 'Sunset', preview: 'from-orange-500 via-rose-500 to-purple-600' },
];

const buttonStyles = ['solid', 'outline', 'soft', 'pill'];

export default function LinkInBioBuilderPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const { data, isLoading, error, refetch } = useApiQuery(['link-in-bio'], async () => {
    const response = await linkInBioService.list();
    return response.data.pages;
  });

  useEffect(() => {
    document.title = 'Link-in-bio builder — Instaflow';
  }, []);

  const page = useMemo(
    () => (data ?? []).find((item) => item.id === selectedId) ?? data?.[0],
    [data, selectedId],
  );

  const create = async () => {
    try {
      const response = await linkInBioService.create({ title: newTitle });
      toast.success('Page created');
      setCreateOpen(false);
      setNewTitle('');
      await refetch();
      setSelectedId(response.data.page.id);
    } catch (err) {
      toast.error('Could not create the page', { description: (err as Error).message });
    }
  };

  const remove = async (id: string) => {
    try {
      await linkInBioService.remove(id);
      toast.success('Page deleted');
      setSelectedId(null);
      await refetch();
    } catch (err) {
      toast.error('Could not delete the page', { description: (err as Error).message });
    }
  };

  const togglePublish = async (target: LinkInBioPage) => {
    try {
      if (target.isPublished) {
        await linkInBioService.unpublish(target.id);
        toast.success('Page unpublished');
      } else {
        await linkInBioService.publish(target.id);
        toast.success('Page published');
      }
      await refetch();
    } catch (err) {
      toast.error('Could not update the page', { description: (err as Error).message });
    }
  };

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Link-in-bio builder"
        description="Create a branded landing page that lives right in your Instagram bio."
        actions={
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New page
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="h-96 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-96 animate-pulse rounded-xl bg-muted/50" />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Link2}
          title="No link-in-bio pages yet"
          description="Build a page with your links, pick a theme and publish it to your bio."
          action={
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create your first page
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {data?.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-colors',
                  page?.id === item.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-accent/50',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <Badge variant={item.isPublished ? 'success' : 'secondary'}>
                    {item.isPublished ? 'Live' : 'Draft'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  /p/{item.slug} · {item.links.length} links
                </p>
              </button>
            ))}
          </div>

          {page && <PageEditor key={page.id} page={page} onChanged={refetch} onDelete={remove} onTogglePublish={togglePublish} />}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New link-in-bio page</DialogTitle>
            <DialogDescription>Give it a name — you can change the public URL later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="page-title">Page title</Label>
            <Input
              id="page-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Acme Studio"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={create} disabled={!newTitle.trim()}>
              Create page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PageEditor({
  page,
  onChanged,
  onDelete,
  onTogglePublish,
}: {
  page: LinkInBioPage;
  onChanged: () => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onTogglePublish: (page: LinkInBioPage) => Promise<void>;
}) {
  const [draft, setDraft] = useState(page);
  const [saving, setSaving] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  useEffect(() => {
    setDraft(page);
  }, [page]);

  const save = async () => {
    setSaving(true);
    try {
      await linkInBioService.update(page.id, {
        title: draft.title,
        bio: draft.bio,
        avatarUrl: draft.avatarUrl,
        theme: draft.theme,
        links: draft.links,
        socialLinks: draft.socialLinks,
        seo: draft.seo,
      });
      toast.success('Page saved');
      await onChanged();
    } catch (err) {
      toast.error('Could not save the page', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    setDraft((current) => ({
      ...current,
      links: [
        ...current.links,
        {
          id: `link_${Date.now().toString(36)}`,
          title: newLinkTitle.trim(),
          url: newLinkUrl.trim(),
          isActive: true,
          clicks: 0,
          order: current.links.length,
        },
      ],
    }));
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const removeLink = (id: string) => {
    setDraft((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== id),
    }));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Content</CardTitle>
            <div className="flex items-center gap-2">
              {page.isPublished && (
                <Button asChild variant="ghost" size="sm">
                  <a href={page.publicUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void onTogglePublish(page)}>
                {page.isPublished ? 'Unpublish' : 'Publish'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lib-title">Title</Label>
              <Input
                id="lib-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lib-bio">Bio</Label>
              <Textarea
                id="lib-bio"
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                placeholder="Tell visitors who you are and what you do."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lib-avatar">Profile picture URL</Label>
              <Input
                id="lib-avatar"
                value={draft.avatarUrl ?? ''}
                onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.links.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                No links yet — add your first one below.
              </p>
            )}
            {draft.links.map((link) => (
              <div key={link.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2">
                  <p className="truncate text-sm font-medium">{link.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {link.clicks}
                </Badge>
                <Button variant="ghost" size="icon-sm" onClick={() => removeLink(link.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                placeholder="Link title"
              />
              <Input
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
              <Button variant="outline" onClick={addLink}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" /> Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {templates.map((template) => (
                  <button
                    key={template.value}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        theme: { ...current.theme, template: template.value as never },
                      }))
                    }
                    className={cn(
                      'overflow-hidden rounded-lg border-2 transition-all',
                      draft.theme.template === template.value
                        ? 'border-primary'
                        : 'border-transparent hover:border-border',
                    )}
                  >
                    <div className={cn('h-14 bg-gradient-to-br', template.preview)} />
                    <p className="bg-card px-2 py-1.5 text-xs font-medium">{template.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bg-color">Background</Label>
                <Input
                  id="bg-color"
                  type="color"
                  value={draft.theme.backgroundColor}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      theme: { ...draft.theme, backgroundColor: e.target.value },
                    })
                  }
                  className="h-10 cursor-pointer p-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent-color">Accent</Label>
                <Input
                  id="accent-color"
                  type="color"
                  value={draft.theme.accentColor}
                  onChange={(e) =>
                    setDraft({ ...draft, theme: { ...draft.theme, accentColor: e.target.value } })
                  }
                  className="h-10 cursor-pointer p-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Button style</Label>
              <Select
                value={draft.theme.buttonStyle}
                onValueChange={(value) =>
                  setDraft({ ...draft, theme: { ...draft.theme, buttonStyle: value as never } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buttonStyles.map((style) => (
                    <SelectItem key={style} value={style} className="capitalize">
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="show-profile" className="cursor-pointer">
                Show Instagram profile
              </Label>
              <Switch
                id="show-profile"
                checked={draft.theme.showInstagramProfile}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, theme: { ...draft.theme, showInstagramProfile: checked } })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button variant="gradient" className="flex-1" loading={saving} onClick={save}>
                <Save className="h-4 w-4" /> Save changes
              </Button>
              <Button variant="destructive" onClick={() => void onDelete(page.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" /> Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <Eye className="mx-auto h-4 w-4 text-muted-foreground" />
                <p className="mt-1 text-lg font-bold">{formatNumber(page.analytics.views)}</p>
                <p className="text-[11px] text-muted-foreground">Views</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <MousePointerClick className="mx-auto h-4 w-4 text-muted-foreground" />
                <p className="mt-1 text-lg font-bold">{formatNumber(page.analytics.clicks)}</p>
                <p className="text-[11px] text-muted-foreground">Clicks</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="mt-1 text-lg font-bold">
                  {formatNumber(page.analytics.uniqueVisitors)}
                </p>
                <p className="text-[11px] text-muted-foreground">Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
