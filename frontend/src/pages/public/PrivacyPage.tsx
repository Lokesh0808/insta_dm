import { useEffect } from 'react';

const sections = [
  {
    title: '1. Information we collect',
    body: [
      'Account information: when you create an Instaflow account we collect your name, email address, password (stored as a one-way bcrypt hash) and workspace preferences.',
      'Instagram data: when you connect an Instagram Professional account through Meta OAuth, we store the account identifier, username, profile picture, follower counts and an encrypted copy of the access token. Access tokens are encrypted at rest with AES-256-GCM and are never exposed to the browser or to other workspaces.',
      'Conversation data: inbound and outbound Instagram messages, automation triggers and execution logs are stored so you can review conversations, monitor performance and re-engage leads.',
      'Lead data: usernames, names and — only when voluntarily provided by the user — email addresses and phone numbers that are collected through your automations.',
      'Technical data: IP address, user agent and request logs are processed for security, rate limiting and audit purposes. We use a privacy-friendly, self-hosted error tracker.',
    ],
  },
  {
    title: '2. How we use information',
    body: [
      'To operate the service: authenticating you, executing automations against your connected Instagram accounts, storing conversations and delivering analytics.',
      'To bill you: processing subscription payments through Razorpay and enforcing plan limits.',
      'To keep the platform secure: detecting abuse, enforcing rate limits, and maintaining audit logs.',
      'We do not sell your personal data and we do not share it with third parties for their own marketing purposes.',
    ],
  },
  {
    title: '3. Instagram platform compliance',
    body: [
      'Instaflow uses only the official Meta Instagram Graph API and Instagram Messaging API. We never scrape Instagram, never ask for your Instagram password, and never run browser automation against your account.',
      'Your use of the service must comply with the Instagram Platform Terms and Meta policies, including the messaging policies and the 24-hour messaging window we enforce automatically.',
      'You are responsible for the content of your automated replies and for ensuring that your messages do not violate Meta policies.',
    ],
  },
  {
    title: '4. Data retention',
    body: [
      'Conversation and automation execution data is retained while your workspace is active. You can delete individual records at any time.',
      'When you disconnect an Instagram account, the associated encrypted access token is deleted immediately.',
      'When you close your workspace, personal data is removed within 30 days, except where retention is required for legal or accounting purposes (for example, invoices).',
    ],
  },
  {
    title: '5. Your rights',
    body: [
      'You can access, export and delete your data at any time from your workspace settings, or by contacting us.',
      'You can request a full export of your workspace data, including conversations, leads and analytics.',
      'You can object to processing, request rectification of inaccurate data, or ask us to erase your account entirely.',
    ],
  },
  {
    title: '6. Security',
    body: [
      'All traffic is served over HTTPS. Passwords are hashed with bcrypt, OAuth tokens are encrypted at rest, and every API request is validated, rate limited and logged for audit.',
      'Workspaces are fully isolated — data belonging to one workspace can never be accessed by another.',
    ],
  },
  {
    title: '7. Third-party processors',
    body: [
      'Meta Platforms, Inc. — Instagram Graph API, messaging and webhooks.',
      'Razorpay — subscription payments and invoicing.',
      'Amazon Web Services — hosting, storage and backups.',
      'Google — optional single sign-on via Google OAuth.',
    ],
  },
  {
    title: '8. Contact',
    body: [
      'Questions about this policy can be sent to privacy@instaflow.com. We respond to all privacy requests within 30 days.',
    ],
  },
];

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy — Instaflow';
  }, []);

  return (
    <div className="container max-w-3xl py-16 lg:py-24">
      <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>

      <div className="mt-10 space-y-9">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold tracking-tight">{section.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {section.body.map((paragraph) => (
                <li key={paragraph} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {paragraph}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
