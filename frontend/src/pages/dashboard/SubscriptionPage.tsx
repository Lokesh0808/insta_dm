import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, CreditCard, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState, ErrorState, LoadingCards } from '@/dashboard/widgets';
import { useApiQuery } from '@/hooks';
import { billingService } from '@/services';
import { toast } from '@/components/ui/toaster';
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import type { Plan } from '@/types';

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  theme: { color: string };
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function SubscriptionPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [processing, setProcessing] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useApiQuery(
    ['subscription', cycle],
    async () => {
      const [subscription, plans] = await Promise.all([
        billingService.subscription(),
        billingService.plans(),
      ]);
      return { subscription: subscription.data, plans: plans.data.plans };
    },
  );

  const { data: history } = useApiQuery(['billing-history'], async () => {
    const response = await billingService.history();
    return response.data.payments;
  });

  useEffect(() => {
    document.title = 'Subscription — Instaflow';
  }, []);

  const subscription = data?.subscription?.subscription;
  const usage = data?.subscription?.usage;
  const plans = data?.plans ?? [];

  const currentPlanIndex = useMemo(
    () => plans.findIndex((plan) => plan.id === subscription?.plan),
    [plans, subscription?.plan],
  );

  const startCheckout = async (plan: Plan) => {
    setProcessing(plan.id);
    try {
      const response = await billingService.createOrder(plan.id, cycle);
      const order = response.data.order;

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Could not load the payment window', {
          description: 'Check that the Razorpay checkout script is reachable.',
        });
        return;
      }

      const razorpay = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount * 100,
        currency: order.currency,
        name: 'Instaflow',
        description: `${plan.name} plan — ${cycle}`,
        theme: { color: '#6366f1' },
        handler: async (result) => {
          try {
            await billingService.verifyPayment({
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              razorpaySignature: result.razorpay_signature,
              plan: plan.id,
              billingCycle: cycle,
            });
            toast.success('Payment verified — your plan has been upgraded', {
              description: 'The payment was confirmed on the server.',
            });
            await refetch();
          } catch (err) {
            toast.error('Payment could not be verified', {
              description: (err as Error).message,
            });
          }
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled');
          },
        },
      });

      razorpay.open();
    } catch (err) {
      toast.error('Could not start the checkout', { description: (err as Error).message });
    } finally {
      setProcessing(null);
    }
  };

  const cancelSubscription = async () => {
    try {
      await billingService.cancel();
      toast.success('Subscription will end at the close of the billing period');
      await refetch();
    } catch (err) {
      toast.error('Could not cancel', { description: (err as Error).message });
    }
  };

  if (error) return <ErrorState description={error.message} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Subscription & billing"
        description="Manage your plan, monitor usage and download your invoices."
      />

      {isLoading ? (
        <LoadingCards count={3} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current plan</CardTitle>
                {subscription && (
                  <Badge variant={subscription.status === 'active' ? 'success' : 'warning'}>
                    {subscription.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl font-extrabold capitalize">{subscription?.plan ?? 'free'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subscription?.price
                    ? `${formatCurrency(subscription.price, subscription.currency)} / ${subscription.billingCycle}`
                    : 'Free forever'}
                </p>
              </div>

              {subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'}{' '}
                  {formatDate(subscription.currentPeriodEnd)}
                </div>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <Alert variant="warning">
                  <AlertIcon variant="warning" />
                  <AlertDescription>
                    Your subscription is set to cancel at the end of the billing period.
                  </AlertDescription>
                </Alert>
              )}

              <Button variant="outline" className="w-full" onClick={cancelSubscription}>
                Cancel subscription
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Usage this period</CardTitle>
              <p className="text-sm text-muted-foreground">
                Usage resets on the first day of every month.
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <UsageRow
                label="Automation events"
                used={usage?.metrics.automationEvents.used ?? 0}
                limit={usage?.metrics.automationEvents.limit ?? null}
              />
              <UsageRow
                label="Instagram accounts"
                used={usage?.metrics.instagramAccounts.used ?? 0}
                limit={usage?.metrics.instagramAccounts.limit ?? null}
              />
              <UsageRow
                label="Active automations"
                used={usage?.metrics.activeAutomations.used ?? 0}
                limit={usage?.metrics.activeAutomations.limit ?? null}
              />
              <UsageRow
                label="Messages sent"
                used={usage?.metrics.messagesSent.used ?? 0}
                limit={null}
              />
              <UsageRow
                label="Leads created"
                used={usage?.metrics.leadsCreated.used ?? 0}
                limit={null}
              />
              <UsageRow label="Link clicks" used={usage?.metrics.linkClicks.used ?? 0} limit={null} />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="plans" className="mt-6">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing history</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="mb-4 flex justify-end">
            <Tabs value={cycle} onValueChange={(value) => setCycle(value as 'monthly' | 'yearly')}>
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
              const isCurrent = plan.id === subscription?.plan;
              const isUpgrade = currentPlanIndex >= 0 && plans.findIndex((p) => p.id === plan.id) > currentPlanIndex;

              return (
                <Card key={plan.id} className={cn(plan.popular ? 'border-primary shadow-lg' : '')}>
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">{plan.name}</p>
                      {isCurrent && <Badge variant="success">Current</Badge>}
                      {plan.popular && !isCurrent && <Badge variant="info">Popular</Badge>}
                    </div>
                    <p className="mt-3 text-2xl font-extrabold">
                      {plan.priceMonthly === 0 ? '₹0' : formatCurrency(price, plan.currency)}
                      {plan.priceMonthly > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          /{cycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      )}
                    </p>
                    <ul className="mt-4 flex-1 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4 w-full"
                      variant={isCurrent ? 'outline' : plan.popular ? 'gradient' : 'default'}
                      disabled={isCurrent}
                      loading={processing === plan.id}
                      onClick={() => void startCheckout(plan)}
                    >
                      {isCurrent ? 'Current plan' : isUpgrade ? 'Upgrade' : 'Switch plan'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing history</CardTitle>
            </CardHeader>
            <CardContent>
              {(history?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No payments yet"
                  description="Your invoices will appear here after your first payment."
                  className="border-none"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{payment.invoiceNumber}</TableCell>
                        <TableCell className="capitalize">
                          {payment.plan} · {payment.billingCycle}
                        </TableCell>
                        <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={payment.status === 'captured' ? 'success' : 'secondary'}
                            className="capitalize"
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {payment.paidAt ? formatDate(payment.paidAt) : '—'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon-sm" title="Download invoice">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function UsageRow({
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
