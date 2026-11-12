import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Instagram,
  MessageSquare,
  Target,
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState, ErrorState, LoadingCards, StatCard } from '@/dashboard/widgets';
import { useApiQuery } from '@/hooks';
import { analyticsService } from '@/services';
import { getSocket } from '@/services/socket';
import { cn, formatNumber, relativeTime } from '@/lib/utils';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

const statusStyles: Record<string, string> = {
  success: 'bg-success',
  failed: 'bg-destructive',
  skipped: 'bg-muted-foreground',
  queued: 'bg-warning',
  running: 'bg-chart-2',
};

export default function OverviewPage() {
  const { data, isLoading, error, refetch } = useApiQuery(['analytics-overview'], async () => {
    const response = await analyticsService.overview(30);
    return response.data as any;
  });

  useEffect(() => {
    document.title = 'Overview — Instaflow';
    const socket = getSocket();
    const refresh = () => void refetch();
    socket.on('automation:executed', refresh);
    socket.on('lead:created', refresh);
    return () => {
      socket.off('automation:executed', refresh);
      socket.off('lead:created', refresh);
    };
  }, [refetch]);

  if (error) {
    return <ErrorState description={error.message} onRetry={() => void refetch()} />;
  }

  const cards = data?.cards;
  const usage = data?.usage;
  const recent = data?.recentActivity ?? [];
  const daily: Array<{ date: string; count: number }> = data?.daily ?? [];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Your automation performance at a glance for the last 30 days."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/analytics">
                Full analytics <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="gradient" size="sm">
              <Link to="/dashboard/automations">New automation</Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <LoadingCards count={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Automated DMs"
              value={cards?.automationEvents ?? 0}
              icon={MessageSquare}
              hint="events in the last 30 days"
              accent="primary"
            />
            <StatCard
              title="Conversations"
              value={cards?.conversations ?? 0}
              icon={Activity}
              hint="all time"
              accent="info"
            />
            <StatCard
              title="Leads captured"
              value={cards?.leads ?? 0}
              icon={Target}
              hint="all time"
              accent="success"
            />
            <StatCard
              title="Success rate"
              value={`${cards?.successRate ?? 0}%`}
              icon={TrendingUp}
              hint={`${cards?.failedExecutions ?? 0} failed executions`}
              accent="warning"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Instagram accounts"
              value={cards?.instagramAccounts ?? 0}
              icon={Instagram}
              hint="connected"
              accent="info"
            />
            <StatCard
              title="Active automations"
              value={cards?.activeAutomations ?? 0}
              icon={Workflow}
              hint={`${cards?.totalAutomations ?? 0} total`}
              accent="primary"
            />
            <StatCard
              title="Link-in-bio pages"
              value={cards?.linkInBios ?? 0}
              icon={Zap}
              hint="published pages"
              accent="success"
            />
            <StatCard
              title="Messages sent"
              value={cards?.messages ?? 0}
              icon={MessageSquare}
              hint="all time"
              accent="primary"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Automation volume</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Daily automation events over the last 30 days
                  </p>
                </div>
                <Badge variant="secondary">30 days</Badge>
              </CardHeader>
              <CardContent>
                {daily.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No activity yet"
                    description="Once your automations start replying, the volume chart will appear here."
                    className="border-none py-10"
                  />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="overviewGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value: string) => value.slice(5)}
                          minTickGap={24}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          width={40}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          fill="url(#overviewGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {usage && (
              <Card>
                <CardHeader>
                  <CardTitle>Plan usage</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Resets on the 1st of each month
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <UsageBar
                    label="Automation events"
                    used={usage.metrics.automationEvents.used}
                    limit={usage.metrics.automationEvents.limit}
                  />
                  <UsageBar
                    label="Instagram accounts"
                    used={usage.metrics.instagramAccounts.used}
                    limit={usage.metrics.instagramAccounts.limit}
                  />
                  <UsageBar
                    label="Active automations"
                    used={usage.metrics.activeAutomations.used}
                    limit={usage.metrics.activeAutomations.limit}
                  />

                  <Button asChild variant="outline" className="w-full" size="sm">
                    <Link to="/dashboard/subscription">Manage plan</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="mt-4">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Recent activity</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/automations">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No automations have fired yet"
                  description="Create a keyword automation and your activity feed will fill up here."
                  action={
                    <Button asChild variant="gradient" size="sm">
                      <Link to="/dashboard/automations">Create automation</Link>
                    </Button>
                  }
                  className="border-none"
                />
              ) : (
                <ul className="divide-y divide-border/60">
                  {recent.map((item: any) => (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          statusStyles[item.status] ?? 'bg-muted-foreground',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.automation?.name ?? 'Workspace automation'}
                          {item.triggerKeyword && (
                            <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                              “{item.triggerKeyword}”
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.igUsername ? `@${item.igUsername} · ` : ''}
                          {item.instagramAccount?.username ? `${item.instagramAccount.username} · ` : ''}
                          {relativeTime(item.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          item.status === 'success'
                            ? 'success'
                            : item.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="shrink-0 capitalize"
                      >
                        {item.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const percentage = limit ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {formatNumber(used)}
          {limit !== null ? ` / ${formatNumber(limit)}` : ''}
        </span>
      </div>
      <Progress
        value={percentage}
        indicatorClassName={
          percentage > 90 ? 'bg-destructive' : percentage > 70 ? 'bg-warning' : 'bg-gradient-primary'
        }
      />
    </div>
  );
}
