import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Instagram,
  MessageSquare,
  MousePointerClick,
  Sparkles,
  Target,
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const features = [
  {
    icon: MessageSquare,
    title: 'Keyword auto-DM',
    description:
      'Reply to any DM containing a keyword — exact, partial or regex matching with priority-based rules.',
    accent: 'from-chart-1/20 to-chart-1/5',
    iconColor: 'text-chart-1',
  },
  {
    icon: MousePointerClick,
    title: 'Comment-to-DM',
    description:
      'Turn comments into conversations. Detect a trigger keyword on a post and DM the link instantly.',
    accent: 'from-chart-2/20 to-chart-2/5',
    iconColor: 'text-chart-2',
  },
  {
    icon: Workflow,
    title: 'Visual workflow builder',
    description:
      'Design multi-step automations with triggers, messages, conditions, delays and branching paths.',
    accent: 'from-chart-3/20 to-chart-3/5',
    iconColor: 'text-chart-3',
  },
  {
    icon: Target,
    title: 'Lead collection',
    description:
      'Capture usernames, emails and phone numbers automatically. Search, filter, tag and export to CSV.',
    accent: 'from-chart-4/20 to-chart-4/5',
    iconColor: 'text-chart-4',
  },
  {
    icon: BarChart3,
    title: 'Analytics that matter',
    description:
      'Track DM performance, conversion rates and automation success with beautiful live charts.',
    accent: 'from-chart-5/20 to-chart-5/5',
    iconColor: 'text-chart-5',
  },
  {
    icon: Zap,
    title: 'Link-in-bio pages',
    description:
      'Launch a branded page in minutes with themes, custom links and real-time click analytics.',
    accent: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
];

const steps = [
  {
    step: '01',
    title: 'Connect your Instagram',
    description:
      'Authorize with Meta OAuth and pick the Professional account you want to automate.',
  },
  {
    step: '02',
    title: 'Create an automation',
    description:
      'Choose a trigger, write your reply and decide when it should fire. No code required.',
  },
  {
    step: '03',
    title: 'Let it run',
    description:
      'Instaflow replies instantly, captures leads and reports on every single interaction.',
  },
];

const stats = [
  { value: '2.4M+', label: 'messages automated monthly' },
  { value: '99.9%', label: 'API uptime' },
  { value: '<2s', label: 'average reply time' },
  { value: '12k+', label: 'businesses onboarded' },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ---------------- Hero ---------------- */}
      <section className="relative">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 10%, hsl(var(--primary) / 0.35), transparent 45%), radial-gradient(circle at 80% 20%, hsl(var(--chart-5) / 0.28), transparent 40%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern opacity-[0.25] dark:opacity-[0.08]"
          style={{ backgroundSize: '48px 48px' }}
        />

        <div className="container py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 bg-primary/5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Built on the official Instagram Platform API
            </Badge>

            <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Automate Instagram DMs.{' '}
              <span className="gradient-text">Convert conversations into customers.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Instaflow replies to your DMs and comments in seconds, captures leads automatically
              and gives you the analytics to grow — all through Meta's official APIs.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="gradient" className="w-full sm:w-auto">
                <Link to="/register">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="w-full sm:w-auto">
                <Link to="/features">Explore features</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · 500 free automation events every month
            </p>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-16 max-w-5xl"
          >
            <div className="relative rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-primary/10">
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                  <span className="ml-3 text-xs text-muted-foreground">
                    instaflow.app/dashboard
                  </span>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-3">
                  {[
                    { label: 'Automated DMs', value: '12,480', delta: '+18.2%' },
                    { label: 'Leads captured', value: '3,912', delta: '+9.4%' },
                    { label: 'Success rate', value: '98.7%', delta: '+1.1%' },
                  ].map((card) => (
                    <div key={card.label} className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-xl font-bold">{card.value}</span>
                        <span className="text-[11px] font-semibold text-success">{card.delta}</span>
                      </div>
                      <div className="mt-3 flex h-10 items-end gap-1">
                        {[40, 65, 45, 80, 60, 92, 75].map((h, i) => (
                          <motion.span
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: 0.4 + i * 0.06, duration: 0.5 }}
                            className="flex-1 rounded-sm bg-gradient-primary/70"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 px-4 pb-4 sm:grid-cols-5">
                  <div className="space-y-2 rounded-lg border border-border bg-card p-3 sm:col-span-1">
                    {['Overview', 'Automations', 'Leads', 'Analytics'].map((item, i) => (
                      <div
                        key={item}
                        className={`rounded px-2 py-1.5 text-[11px] font-medium ${
                          i === 1 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 rounded-lg border border-border bg-card p-3 sm:col-span-4">
                    {[
                      { k: 'PRICE', r: 'Here is our pricing link →', s: 'success' },
                      { k: 'BOOKING', r: 'Available Tue & Thu, 3pm', s: 'success' },
                      { k: 'hello', r: 'Thanks for reaching out!', s: 'success' },
                    ].map((row) => (
                      <div
                        key={row.k}
                        className="flex items-center gap-3 rounded-md border border-border/60 bg-background/60 px-3 py-2"
                      >
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {row.k}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{row.r}</span>
                        <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-success" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="container grid grid-cols-2 gap-8 py-12 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="container py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run Instagram as a team
          </h2>
          <p className="mt-4 text-muted-foreground">
            Replace the manual work of replying to every DM and comment with reliable automation.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
            >
              <Card className="card-hover h-full">
                <CardContent className="p-6">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} ${feature.iconColor}`}
                  >
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="border-y border-border/60 bg-muted/20">
        <div className="container py-20 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              How it works
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Live in three simple steps
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative rounded-xl border border-border bg-card p-6"
              >
                <span className="text-4xl font-extrabold text-primary/20">{step.step}</span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container py-20 lg:py-28">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-chart-5/10 px-6 py-16 text-center">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Your competitors reply in minutes. You reply instantly.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands of businesses using Instaflow to turn Instagram into a predictable
              revenue channel.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" variant="gradient">
                <Link to="/register">
                  Create your free account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/pricing">Compare plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
