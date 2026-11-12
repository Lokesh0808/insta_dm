import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Acceptance of terms',
    body: [
      'By creating an account or using Instaflow ("the Service") you agree to these Terms of Service and to the Instagram Platform Terms and policies published by Meta Platforms, Inc.',
      'If you do not agree with these terms you must not create an account or use the Service.',
    ],
  },
  {
    title: '2. Eligibility',
    body: [
      'You must be at least 18 years old and legally able to enter into a binding agreement.',
      'You must own or have permission to manage the Instagram Professional accounts you connect, and you must be the authorised owner or administrator of the Facebook account used for the Meta OAuth flow.',
    ],
  },
  {
    title: '3. Your responsibilities',
    body: [
      'Provide accurate information and keep your account credentials secure.',
      'Ensure that all content you send through the Service — including automated replies, comments and link-in-bio pages — complies with applicable law, the Instagram Platform Terms and Meta policies.',
      'Do not use the Service to send unsolicited or deceptive messages, to impersonate others, to violate a person\'s privacy, or to distribute malware.',
      'Do not attempt to circumvent platform limits, including messaging windows, rate limits or our own plan quotas.',
    ],
  },
  {
    title: '4. Permitted integrations',
    body: [
      'You authorise Instaflow to access the Instagram accounts you connect through Meta\'s official OAuth flow, and to send messages on your behalf within the permissions you granted.',
      'We only use official Meta APIs. Reverse engineering, scraping, credential sharing and browser automation are prohibited by these terms.',
    ],
  },
  {
    title: '5. Plans, billing and refunds',
    body: [
      'Paid plans are billed in advance either monthly or yearly through Razorpay. All prices are exclusive of applicable taxes.',
      'Plan limits (connected Instagram accounts, active automations and monthly automation events) are enforced automatically. Events beyond your limit are not executed.',
      'You may cancel a subscription at any time; access continues until the end of the current billing period.',
      'Except where required by law or where a plan change is made in error, payments are non-refundable. We may issue a pro-rata credit when you upgrade mid-cycle.',
    ],
  },
  {
    title: '6. Suspension and termination',
    body: [
      'You may delete your workspace at any time, which permanently removes your data and revokes access tokens.',
      'We may suspend or terminate access if you breach these terms, if your usage violates Meta policies, or if required by law.',
    ],
  },
  {
    title: '7. Intellectual property',
    body: [
      'Instaflow and its licensors own all rights in the Service, including the software, design and documentation. We grant you a limited, non-exclusive, non-transferable licence to use the Service.',
      'You retain all rights to the content you create with the Service.',
    ],
  },
  {
    title: '8. Disclaimer and liability',
    body: [
      'The Service is provided "as is" and "as available" without warranties of any kind, express or implied.',
      'To the maximum extent permitted by law, our aggregate liability arising out of or relating to the Service is limited to the amount you paid us in the 12 months preceding the claim.',
      'We are not responsible for the content of your messages, for actions taken by the people you contact, or for any loss of business opportunity.',
    ],
  },
  {
    title: '9. Changes',
    body: [
      'We may update these terms. Material changes will be announced in the product or by email at least 14 days before they take effect.',
      'Continued use of the Service after a change means you accept the updated terms.',
    ],
  },
];

export default function TermsPage() {
  useEffect(() => {
    document.title = 'Terms of Service — Instaflow';
  }, []);

  return (
    <div className="container max-w-3xl py-16 lg:py-24">
      <h1 className="text-4xl font-extrabold tracking-tight">Terms of Service</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>

      <div className="mt-10 space-y-9">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold tracking-tight">{section.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {section.body.map((paragraph) => (
                <li
                  key={paragraph}
                  className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {paragraph}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Questions about these terms? Write to us at{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          legal@instaflow.com
        </Link>
        .
      </div>
    </div>
  );
}
