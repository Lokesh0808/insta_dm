import { useEffect, useState } from 'react';
import { Activity, BarChart3, MessageSquare, Target, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingCards, StatCard } from '@/dashboard/widgets';
import { useApiQuery } from '@/hooks';
import { analyticsService } from '@/services';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

const chartTooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 10,
  fontSize: 12,
};

export default function AnalyticsPage() {
  const [range, setRange] = useState('30');

  const { data, isLoading, error, refetch } = useApiQuery(
    ['analytics', range],
    async () => {
      const [dms, leads] = await Promise.all([
        analyticsService.dms(Number(range)),
        analyticsService.leads(Number(range)),
      ]);
      return { dms: dms.data as any, leads: leads.data as any };
    },
  );

  useEffect(() => {
    document.title = 'Analytics — Instaflow';
  }, []);

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  const dms = data?.dms;
  const leads = data?.leads;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Understand how your automations perform and where your leads come from."
        actions={
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              {RANGES.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {isLoading ? (
        <LoadingCards count={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Automation events"
              value={dms?.total ?? 0}
              icon={Activity}
              hint={`${dms?.succeeded ?? 0} succeeded`}
            />
            <StatCard
              title="Messages sent"
              value={dms?.messages?.outbound ?? 0}
              icon={MessageSquare}
              hint={`${dms?.messages?.inbound ?? 0} received`}
              accent="info"
            />
            <StatCard
              title="Leads captured"
              value={leads?.total ?? 0}
              icon={Target}
              hint={`${leads?.qualified ?? 0} qualified`}
              accent="success"
            />
            <StatCard
              title="Conversion rate"
              value={`${leads?.conversionRate ?? 0}%`}
              icon={TrendingUp}
              hint={`${leads?.converted ?? 0} converted`}
              accent="warning"
            />
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>DM performance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Automation events per day over the selected period
              </p>
            </CardHeader>
            <CardContent>
              {(dms?.daily?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No data in this period"
                  description="Pick a longer range or activate an automation to start collecting data."
                  className="border-none"
                />
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dms.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dmGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
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
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Events"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        fill="url(#dmGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leads by source</CardTitle>
              </CardHeader>
              <CardContent>
                {(leads?.bySource?.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={Target}
                    title="No leads yet"
                    description="Lead sources will be broken down here."
                    className="border-none"
                  />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leads.bySource.map((item: any) => ({
                            name: item.source.replace('_', ' '),
                            value: item.count,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          {leads.bySource.map((_: any, index: number) => (
                            <Cell
                              key={index}
                              fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                            />
                          ))}
                        </Pie>
                        <Legend
                          wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }}
                          iconType="circle"
                        />
                        <RechartsTooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top trigger keywords</CardTitle>
              </CardHeader>
              <CardContent>
                {(dms?.topKeywords?.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No keyword data yet"
                    description="Once people trigger your rules, the most popular keywords show up here."
                    className="border-none"
                  />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dms.topKeywords.map((item: any) => ({
                          keyword: item.keyword,
                          count: item.count,
                        }))}
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="keyword"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          width={40}
                        />
                        <RechartsTooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="count" name="Triggers" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Leads over time</CardTitle>
            </CardHeader>
            <CardContent>
              {(leads?.daily?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No lead data in this period"
                  className="border-none"
                />
              ) : (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={leads.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
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
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Leads"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        fill="url(#leadGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
