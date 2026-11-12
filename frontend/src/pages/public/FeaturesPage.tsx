import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  Globe,
  Instagram,
  Layers,
  Lock,
  MessageSquare,
  MousePointerClick,
  ShieldCheck,
  Target,
  Workflow,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const groups = [
  {
    icon: MessageSquare,
    title: 'Messaging automations',
    description: 'Reply to DMs the moment they arrive — without lifting a finger.',
    items: [
      {
        name: 'Keyword auto-DM',
        detail:
          'Exact, partial, starts-with, contains or regex matching. Stack multiple keywords per rule and control which rule wins with priority ordering.',
      },
      {
        name: 'Default fallback message',
        detail:
          'Every unmatched message gets a graceful reply, so no prospect is ever left on read.',
      },
      {
        name: 'Personalised templates',
        detail:
          'Use {{username}} and {{keyword}} placeholders to make every reply feel written by hand.',
      },
      {
        name: 'Quick replies & buttons',
        detail:
          'Attach Instagram-supported quick reply buttons and web links to guide the conversation.',
      },
    ],
  },
  {
    icon: MousePointerClick,
    title: 'Comment-to-DM & story replies',
    description: 'Turn public engagement into private conversations.',
    items: [
      {
        name: 'Post selection',
        detail:
          'Pick exactly which Instagram posts should trigger a DM, and which trigger keywords unlock it.',
      },
      {
        name: 'Duplicate protection',
        detail:
          'Each comment is processed exactly once — no double-DMs, even when Meta retries a webhook.',
      },
      {
        name: 'Story reply automation',
        detail:
          'Respond to story replies with the same rules you already use for DMs.',
      },
    ],
  },
  {
    icon: Workflow,
    title: 'Visual workflow builder',
    description: 'Design multi-step journeys with a drag-and-drop canvas.',
    items: [
      {
        name: 'Trigger nodes',
        detail: 'Start a flow from a keyword, a comment, a follow or any inbound message.',
      },
      {
        name: 'Message nodes',
        detail: 'Send one or many messages, each with its own buttons and delay.',
      },
      {
        name: 'Condition nodes',
        detail: 'Branch the journey based on what the person said or replied.',
      },
      {
        name: 'Delay & link nodes',
        detail:
          'Pause before replying to look natural, then send a link, a lead form or a next step.',
      },
    ],
  },
  {
    icon: Target,
    title: 'Lead capture & management',
    description: 'Every automation can capture and qualify leads automatically.',
    items: [
      {
        name: 'Automatic lead capture',
        detail:
          'Capture the Instagram username, name, email and phone number whenever someone opts in.',
      },
      {
        name: 'Search, filter & tag',
        detail: 'Slice leads by source, status or tag to find hot prospects in seconds.',
      },
      {
        name: 'CSV export',
        detail: 'Export your lead list for your CRM — available on the Growth plan and above.',
      },
    ],
  },
  {
    icon: SparklesIcon,
    title: 'Link-in-bio builder',
    description: 'A landing page that lives inside your Instagram bio.',
    items: [
      {
        name: 'Custom themes',
        detail: 'Five templates, custom colours, background images and button styles.',
      },
      {
        name: 'Click analytics',
        detail: 'See views, unique visitors and per-link clicks in real time.',
      },
      {
        name: 'Mobile-first & fast',
        detail: 'Pages load instantly on mobile and look great on every screen size.',
      },
      {
        name: 'Custom domains',
        detail: 'Point your own domain at a page — the groundwork is already in place.',
      },
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics & reporting',
    description: 'Know exactly what is working.',
    items: [
      {
        name: 'Live dashboard',
        detail: 'DM volume, conversations, leads, active automations and success rate at a glance.',
      },
      {
        name: 'Performance charts',
        detail: 'Daily DM volume, trigger breakdown and your top-performing keywords.',
      },
      {
        name: 'Lead conversion',
        detail: 'Track where leads come from and how many convert to customers.',
      },
    ],
  },
];

function SparklesIcon(props: React.ComponentProps<typeof Zap>) {
  return <Layers {...props} />;
}

const highlights = [
  { icon: Lock, title: 'Tokens stay server-side', detail: 'Instagram access tokens are encrypted at rest and never reach the browser.' },
  { icon: ShieldCheck, title: 'Official Meta APIs only', detail: 'No scraping, no browser automation — just the supported Graph API endpoints.' },
  { icon: Globe, title: 'Policy compliant', detail: 'Messaging windows and rate limits are respected automatically.' },
  { icon: Bell, title: 'Real-time updates', detail: 'Watch automations fire live over a secure WebSocket connection.' },
];

export default function FeaturesPage() {
  return (
    <div className="container py-16 lg:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="mb-4">
          Features
        </Badge>
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          A complete Instagram automation platform
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          From the first keyword to the final lead — everything is built on Meta's official
          Instagram Platform APIs.
        </p>
        <Button asChild size="lg" variant="gradient" className="mt-8">
          <Link to="/register">Start free — no credit card</Link>
        </Button>
      </div>

      <div className="mt-20 space-y-16">
        {groups.map((group, groupIndex) => (
          <motion.section
            key={group.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.55 }}
          >
            <div className="mb-8 flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <group.icon className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{group.title}</h2>
                <p className="mt-1 text-muted-foreground">{group.description}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {group.items.map((item, itemIndex) => (
                <Card key={item.name} className="card-hover h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                        <Zap className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">{item.name}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <section className="mt-20 grid gap-4 rounded-2xl border border-border bg-muted/30 p-8 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <div key={item.title}>
            <item.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </section>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to automate your Instagram?
        </h2>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="gradient">
            <Link to="/register">Create free account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
