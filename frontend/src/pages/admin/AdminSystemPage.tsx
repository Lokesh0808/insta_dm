import { useEffect, useState } from 'react';
import { Activity, Cpu, Database, HardDrive, RefreshCw, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ErrorState, TableSkeleton } from '@/dashboard/widgets';
import { useApiQuery } from '@/hooks';
import { adminService } from '@/services';
import { formatNumber } from '@/lib/utils';

export default function AdminSystemPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['admin-health'],
    async () => {
      const response = await adminService.health();
      return response.data as any;
    },
    { refetchInterval: autoRefresh ? 30_000 : false },
  );

  const { data: usage } = useApiQuery(['admin-usage'], async () => {
    const response = await adminService.usage();
    return response.data as any;
  });

  useEffect(() => {
    document.title = 'System monitoring — Instaflow admin';
  }, []);

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  const services = data?.services ?? {};
  const memory = data?.memory ?? {};

  const serviceStatus = (state?: string) => {
    const ok = state === 'connected' || state === 'running' || state === 'ready';
    return (
      <Badge variant={ok ? 'success' : 'destructive'} className="gap-1">
        <span className={ok ? 'h-1.5 w-1.5 rounded-full bg-current' : 'h-1.5 w-1.5 rounded-full bg-current'} />
        {state ?? 'unknown'}
      </Badge>
    );
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight lg:text-2xl">System monitoring</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live health of the API, database, cache and queue workers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
            />
            Auto refresh
          </label>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HealthCard
          icon={Server}
          label="API server"
          value={data?.status ?? 'unknown'}
          detail={`${data?.environment ?? '—'} · node ${data?.node ?? '—'}`}
          status={services.api}
        />
        <HealthCard
          icon={Database}
          label="MongoDB"
          value={services.mongodb ?? 'unknown'}
          detail="Primary datastore"
          status={services.mongodb}
        />
        <HealthCard
          icon={Activity}
          label="Redis"
          value={services.redis ?? 'unknown'}
          detail="Cache & queue broker"
          status={services.redis}
        />
        <HealthCard
          icon={Cpu}
          label="Memory"
          value={`${memory.heapUsed ?? 0} MB`}
          detail={`RSS ${memory.rss ?? 0} MB · heap ${memory.heapTotal ?? 0} MB`}
          status={services.api}
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <HardDrive className="h-4 w-4" /> Usage counters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usage?.usage ?? []).slice(0, 25).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.workspace.slice(0, 12)}…</TableCell>
                    <TableCell className="text-sm capitalize">{item.metric.replace('_', ' ')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.period}</TableCell>
                    <TableCell className="font-semibold">{formatNumber(item.count)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.limit ? formatNumber(item.limit) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CounterCard label="Automation executions" value={usage?.counters?.executions ?? 0} />
        <CounterCard label="Instagram accounts" value={usage?.counters?.accounts ?? 0} />
        <CounterCard label="Conversations" value={usage?.counters?.conversations ?? 0} />
        <CounterCard label="Leads" value={usage?.counters?.leads ?? 0} />
      </div>
    </>
  );
}

function HealthCard({
  icon: Icon,
  label,
  value,
  detail,
  status,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  detail: string;
  status?: string;
}) {
  const ok = status === 'connected' || status === 'running' || status === 'ready';
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold capitalize">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CounterCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{formatNumber(value)}</p>
      </CardContent>
    </Card>
  );
}
