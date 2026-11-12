import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorState, TableSkeleton } from '@/dashboard/widgets';
import { useApiQuery } from '@/hooks';
import { adminService } from '@/services';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function AdminSubscriptionsPage() {
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['admin-subscriptions', plan, status, page],
    async () => {
      const response = await adminService.subscriptions({
        plan: plan !== 'all' ? plan : undefined,
        status: status !== 'all' ? status : undefined,
        page,
        limit: 25,
      });
      return response.data;
    },
  );

  useEffect(() => {
    document.title = 'Subscriptions — Instaflow admin';
  }, []);

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  const meta = data?.meta;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight lg:text-2xl">Subscriptions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every active and historical subscription on the platform.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Select
          value={plan}
          onValueChange={(value) => {
            setPlan(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-[200px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="past_due">Past due</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Usage (events)</TableHead>
                  <TableHead>Renews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.subscriptions?.map((subscription: any) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{subscription.workspace?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {subscription.workspace?.slug ?? ''}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {subscription.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          subscription.status === 'active'
                            ? 'success'
                            : subscription.status === 'past_due'
                              ? 'warning'
                              : 'destructive'
                        }
                        className="capitalize"
                      >
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(subscription.price, subscription.currency)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        /{subscription.billingCycle === 'yearly' ? 'yr' : 'mo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {subscription.usage?.automationEvents ?? 0}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {subscription.currentPeriodEnd
                        ? formatDateTime(subscription.currentPeriodEnd)
                        : '—'}
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
            Page {meta.page} of {meta.totalPages} · {meta.total} subscriptions
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
    </>
  );
}
