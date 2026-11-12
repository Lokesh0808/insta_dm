import type { SubscriptionPlan } from '../types/enums';

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  instagramAccounts: number;
  activeAutomations: number;
  automationEventsPerMonth: number;
  features: string[];
  /** Feature gates used across the app. */
  entitlements: {
    linkInBio: boolean;
    leadExport: boolean;
    workflowBuilder: boolean;
    advancedAnalytics: boolean;
    teamMembers: boolean;
    prioritySupport: boolean;
    unlimitedAutomations: boolean;
  };
  popular?: boolean;
}

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
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
      'Community support',
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
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For creators growing their first audience.',
    priceMonthly: 999,
    priceYearly: 9990,
    currency: 'INR',
    instagramAccounts: 2,
    activeAutomations: 10,
    automationEventsPerMonth: 5_000,
    features: [
      '2 Instagram accounts',
      '10 active automations',
      '5,000 automation events / month',
      'Link-in-bio pages',
      'Basic lead management',
      'Email support',
    ],
    entitlements: {
      linkInBio: true,
      leadExport: false,
      workflowBuilder: false,
      advancedAnalytics: false,
      teamMembers: false,
      prioritySupport: false,
      unlimitedAutomations: false,
    },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'Scale lead generation with advanced automation.',
    priceMonthly: 2499,
    priceYearly: 24_990,
    currency: 'INR',
    instagramAccounts: 5,
    activeAutomations: 50,
    automationEventsPerMonth: 25_000,
    features: [
      '5 Instagram accounts',
      '50 active automations',
      '25,000 automation events / month',
      'Advanced analytics',
      'Lead export (CSV)',
      'Workflow builder',
      'Link-in-bio pages',
    ],
    entitlements: {
      linkInBio: true,
      leadExport: true,
      workflowBuilder: true,
      advancedAnalytics: true,
      teamMembers: false,
      prioritySupport: false,
      unlimitedAutomations: false,
    },
    popular: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For teams running Instagram at scale.',
    priceMonthly: 4999,
    priceYearly: 49_990,
    currency: 'INR',
    instagramAccounts: 10,
    activeAutomations: Number.MAX_SAFE_INTEGER,
    automationEventsPerMonth: 100_000,
    features: [
      '10 Instagram accounts',
      'Unlimited automations (fair use)',
      '100,000 automation events / month',
      'Multiple team members',
      'Advanced reporting',
      'Link-in-bio + custom domains',
      'Priority support',
    ],
    entitlements: {
      linkInBio: true,
      leadExport: true,
      workflowBuilder: true,
      advancedAnalytics: true,
      teamMembers: true,
      prioritySupport: true,
      unlimitedAutomations: false,
    },
  },
};

export const PLAN_ORDER: SubscriptionPlan[] = ['free', 'starter', 'growth', 'business'];

export const getPlan = (plan: SubscriptionPlan): PlanDefinition => PLANS[plan] ?? PLANS.free;

export const planRank = (plan: SubscriptionPlan): number => PLAN_ORDER.indexOf(plan);

/** True when `target` is at least as capable as `current`. */
export const isUpgrade = (current: SubscriptionPlan, target: SubscriptionPlan): boolean =>
  planRank(target) > planRank(current);
