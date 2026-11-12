import { useEffect } from 'react';
import {
  Activity,
  ArrowUpRight,
  DollarSign,
  Target,
  TrendingUp,
  Users,
  Workflow,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ErrorState, LoadingCards, StatCard } from '@/dashboard/widgets';
import { useApiQuery } from '@/hooks';
import { adminService } from '@/services';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useApiQuery(['admin-overview'], async () => {
    const response = await adminService.overview();
    return response.data as any;
  });

  useEffect(() => {
    document.title = 'Admin dashboard — Instaflow';
  }, []);

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  const usageHistory = data?.usageByPeriod ?? [];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight lg:text-2xl">Platform overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live metrics across every Instaflow workspace.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <Activity className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <LoadingCards count={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Monthly recurring revenue"
              value={formatCurrency(data?.mrr ?? 0)}
              icon={DollarSign}
              hint={`ARR ${formatCurrency(data?.arr ?? 0)}`}
              accent="success"
            />
            <StatCard
              title="Registered users"
              value={data?.totalUsers ?? 0}
              icon={Users}
              hint={`${data?.activeUsers ?? 0} active in 30 days`}
            />
            <StatCard
              title="Active subscriptions"
              value={data?.activeSubscriptions ?? 0}
              icon={TrendingUp}
              hint={`${data?.totalSubscriptions ?? 0} total`}
              accent="info"
            />
            <StatCard
              title="Automation events"
              value={data?.automationEvents ?? 0}
              icon={Workflow}
              hint="all time"
              accent="warning"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Workspaces"
              value={data?.totalWorkspaces ?? 0}
              icon={ArrowUpRight}
              accent="primary"
            />
            <StatCard
              title="Leads captured"
              value={data?.totalLeads ?? 0}
              icon={Target}
              accent="success"
            />
            <StatCard
              title="Conversations"
              value={data?.totalConversations ?? 0}
              icon={Activity}
              accent="info"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Automation events by period</CardTitle>
              </CardHeader>
              <CardContent>
                {usageHistory.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No usage recorded yet.
                  </p>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={usageHistory.map((item: any) => ({
                          period: item.period,
                          total: item.total,
                        }))}
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="period"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          width={62}
                          tickFormatter={(value: number) => formatNumber(value)}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                          cursor={{ fill: 'hsl(var(--muted))' }}
                        />
                        <Bar dataKey="total" name="Events" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Row label="MRR" value={formatCurrency(data?.mrr ?? 0)} />
                <Row label="ARR" value={formatCurrency(data?.arr ?? 0)} />
                <Row label="Yearly revenue" value={formatCurrency(data?.yearlyRevenue ?? 0)} />
                <Row
                  label={`Revenue this month (${data?.paymentsThisMonth ?? 0} payments)`}
                  value={formatCurrency(data?.revenueThisMonth ?? 0)}
                />
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Suspended accounts</span>
                  <Badge variant={data?.suspendedUsers ? 'destructive' : 'secondary'}>
                    {data?.suspendedUsers ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total events</span>
                  <span className="font-semibold">{formatNumber(data?.automationEvents ?? 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
