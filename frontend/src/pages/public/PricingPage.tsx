import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApiQuery } from '@/hooks';
import { billingService } from '@/services';
import { formatCurrency } from '@/lib/utils';
import type { Plan } from '@/types';

const fallbackPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Start automating your Instagram DMs for free.',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'INR',
    instagramAccounts: 1,
    activeAutomations: 2,
    automationEventsPerMonth: 500,
    features: [
      '1 Instagram account',
      '2 active automations',
      '500 automation events / month',
      'Basic analytics',
    ],
    entitlements: {
      linkInBio: false,
      leadExport: false,
      workflowBuilder: false,
      advancedAnalytics: false,
      teamMembers: false,
      prioritySupport: false,
      unlimitedAutomations: false,
    },
  },
];

export default function PricingPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { data } = useApiQuery(['plans'], async () => {
    const response = await billingService.plans();
    return response.data.plans;
  });

  const plans = data && data.length > 0 ? data : fallbackPlans;

  useEffect(() => {
    document.title = 'Pricing — Instaflow';
  }, []);

  return (
    <div className="container py-16 lg:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="mb-4">
          Pricing
        </Badge>
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Simple pricing that scales with you
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Start free. Upgrade when your automation volume grows. Cancel any time.
        </p>

        <div className="mt-8 flex justify-center">
          <Tabs value={cycle} onValueChange={(value) => setCycle(value as 'monthly' | 'yearly')}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <Badge variant="success" className="ml-2 text-[10px]">
                  Save 17%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mt-14 grid gap-5 lg:grid-cols-4">
        {plans.map((plan, index) => {
          const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const isFree = plan.id === 'free';

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.07 }}
            >
              <Card
                className={`relative flex h-full flex-col ${
                  plan.popular
                    ? 'border-primary shadow-xl shadow-primary/10 lg:-translate-y-3'
                    : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="gradient" className="bg-gradient-primary text-white shadow-lg">
                      <Sparkles className="mr-1 h-3 w-3" /> Most popular
                    </Badge>
                  </div>
                )}

                <CardContent className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {plan.entitlements.prioritySupport && (
                      <Badge variant="info" className="text-[10px]">
                        Priority
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 min-h-[40px] text-sm text-muted-foreground">
                    {plan.description}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold tracking-tight">
                      {isFree ? '₹0' : formatCurrency(price, plan.currency)}
                    </span>
                    {!isFree && (
                      <span className="text-sm text-muted-foreground">
                        /{cycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  {cycle === 'yearly' && !isFree && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(Math.round(price / 12), plan.currency)} per month, billed yearly
                    </p>
                  )}

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-success/15">
                          <Check className="h-3 w-3 text-success" />
                        </span>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="mt-6 w-full"
                    variant={plan.popular ? 'gradient' : 'outline'}
                    size="lg"
                  >
                    <Link to={isFree ? '/register' : '/register?plan=' + plan.id}>
                      {isFree ? 'Start for free' : `Choose ${plan.name}`}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-8 text-center">
        <h2 className="text-xl font-bold">Need more than 10 Instagram accounts?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Enterprise plans include custom limits, dedicated onboarding, an SLA and custom
          integrations. Talk to our team.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/register">Contact sales</Link>
        </Button>
      </div>
    </div>
  );
}
