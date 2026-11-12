import { useEffect, useState } from 'react';
import { CreditCard, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useApiQuery, useDebounce } from '@/hooks';
import { adminService } from '@/services';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['admin-payments', status, debouncedSearch, page],
    async () => {
      const response = await adminService.payments({
        status: status !== 'all' ? status : undefined,
        page,
        limit: 25,
      });
      return response.data;
    },
  );

  useEffect(() => {
    document.title = 'Payments — Instaflow admin';
  }, []);

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  const meta = data?.meta;
  const total = (data?.payments ?? []).reduce(
    (sum: number, payment: any) => sum + (payment.status === 'captured' ? payment.amount : 0),
    0,
  );

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight lg:text-2xl">Payment history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every Razorpay payment processed by the platform.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
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
          <SelectTrigger className="sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="captured">Captured</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
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
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.payments?.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.invoiceNumber}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{payment.user?.email ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{payment.workspace ?? ''}</p>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {payment.plan} · {payment.billingCycle}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === 'captured'
                            ? 'success'
                            : payment.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="capitalize"
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payment.paidAt ? formatDateTime(payment.paidAt) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Captured on this page: {formatCurrency(total)} · {meta?.total ?? 0} payments total
        </p>
        {meta && meta.totalPages > 1 && (
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
        )}
      </div>
    </>
  );
}
