import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Search, Shield, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorState, TableSkeleton } from '@/dashboard/widgets';
import { useApiQuery, useDebounce } from '@/hooks';
import { adminService } from '@/services';
import { toast } from '@/components/ui/toaster';
import { formatDate, relativeTime } from '@/lib/utils';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['admin-users', debouncedSearch, page],
    async () => {
      const response = await adminService.users({
        search: debouncedSearch || undefined,
        page,
        limit: 25,
      });
      return response.data;
    },
  );

  useEffect(() => {
    document.title = 'Users — Instaflow admin';
  }, []);

  const updateUser = async (id: string, payload: Record<string, unknown>) => {
    try {
      await adminService.updateUser(id, payload);
      toast.success('User updated');
      await refetch();
      setSuspendTarget(null);
      setSuspendReason('');
    } catch (err) {
      toast.error('Could not update the user', { description: (err as Error).message });
    }
  };

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  const meta = data?.meta;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight lg:text-2xl">User management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {meta?.total ?? 0} registered accounts across all workspaces.
        </p>
      </div>

      <div className="mb-5 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.workspace?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.platformRole === 'superadmin'
                            ? 'destructive'
                            : user.platformRole === 'admin'
                              ? 'warning'
                              : 'secondary'
                        }
                        className="capitalize"
                      >
                        {user.platformRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isSuspended ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" /> Suspended
                        </Badge>
                      ) : user.isEmailVerified ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.lastActiveAt ? relativeTime(user.lastActiveAt) : 'Never'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={user.isSuspended ? 'Reinstate' : 'Suspend'}
                          onClick={() =>
                            user.isSuspended
                              ? void updateUser(user.id, { isSuspended: false })
                              : setSuspendTarget(user)
                          }
                        >
                          {user.isSuspended ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Shield className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </Button>
                        <Select
                          value={user.platformRole}
                          onValueChange={(value) => void updateUser(user.id, { platformRole: value })}
                        >
                          <SelectTrigger className="h-8 w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="superadmin">Super</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
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

      <Dialog open={Boolean(suspendTarget)} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {suspendTarget?.email}</DialogTitle>
            <DialogDescription>
              The user will be signed out and blocked from signing back in until reinstated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason</Label>
            <Textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Violating Instagram platform policies"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                void updateUser(suspendTarget.id, {
                  isSuspended: true,
                  suspendedReason: suspendReason,
                })
              }
            >
              Suspend account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
