import nodemailer, { type Transporter } from 'nodemailer';
import { env, isProd } from '../config/env';
import { logger } from '../config/logger';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
};

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (message: EmailMessage): Promise<boolean> => {
  const mailer = getTransporter();
  if (!mailer) {
    if (!isProd) {
      logger.info(
        { to: message.to, subject: message.subject, body: message.text ?? message.html },
        'email skipped — SMTP not configured (logged instead)',
      );
    } else {
      logger.error({ to: message.to }, 'email skipped — SMTP not configured');
    }
    return false;
  }

  try {
    await mailer.sendMail({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return true;
  } catch (error) {
    logger.error({ err: (error as Error).message, to: message.to }, 'email send failed');
    return false;
  }
};

const layout = (title: string, body: string, cta?: { label: string; url: string }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
                <h1 style="margin:0;font-size:20px;color:#ffffff;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#334155;font-size:15px;line-height:1.6;">
                ${body}
                ${
                  cta
                    ? `<p style="margin:28px 0 0;">
                         <a href="${cta.url}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">${cta.label}</a>
                       </p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f8fafc;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const sendVerificationEmail = async (to: string, name: string, token: string) => {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: `Verify your ${env.APP_NAME} account`,
    text: `Hi ${name}, verify your email: ${url}`,
    html: layout(
      `Welcome to ${env.APP_NAME}, ${name}!`,
      `<p>Thanks for signing up. Please confirm your email address to activate your workspace and start automating Instagram DMs.</p>
       <p style="color:#64748b;font-size:13px;">This link expires in 24 hours.</p>`,
      { label: 'Verify email address', url },
    ),
  });
};

export const sendPasswordResetEmail = async (to: string, name: string, token: string) => {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: `Reset your ${env.APP_NAME} password`,
    text: `Hi ${name}, reset your password: ${url}`,
    html: layout(
      'Reset your password',
      `<p>Hi ${name}, we received a request to reset your password. Click the button below to choose a new one.</p>
       <p style="color:#64748b;font-size:13px;">If you did not request this, you can safely ignore this email. The link expires in 1 hour.</p>`,
      { label: 'Reset password', url },
    ),
  });
};

export const sendWelcomeEmail = async (to: string, name: string) => {
  return sendEmail({
    to,
    subject: `Your ${env.APP_NAME} workspace is ready`,
    text: `Hi ${name}, welcome to ${env.APP_NAME}. Connect your Instagram account to start automating.`,
    html: layout(
      `You're all set, ${name}!`,
      `<p>Your workspace is ready. Connect an Instagram Professional account, create your first keyword automation and start replying to DMs in seconds.</p>`,
      { label: 'Open dashboard', url: `${env.CLIENT_URL}/dashboard` },
    ),
  });
};

export const sendSubscriptionEmail = async (
  to: string,
  name: string,
  plan: string,
  status: string,
) => {
  return sendEmail({
    to,
    subject: `Your ${env.APP_NAME} subscription is now ${status}`,
    text: `Hi ${name}, your subscription to the ${plan} plan is ${status}.`,
    html: layout(
      `Subscription ${status}`,
      `<p>Hi ${name}, your subscription to the <strong>${plan}</strong> plan is now <strong>${status}</strong>.</p>`,
      { label: 'Manage billing', url: `${env.CLIENT_URL}/dashboard/subscription` },
    ),
  });
};

export const sendUsageAlertEmail = async (to: string, name: string, metric: string, used: number, limit: number) => {
  return sendEmail({
    to,
    subject: `Usage limit reached: ${metric}`,
    text: `Hi ${name}, you have used ${used}/${limit} of your ${metric} allowance.`,
    html: layout(
      'Usage limit almost reached',
      `<p>Hi ${name}, you have used <strong>${used}</strong> of <strong>${limit}</strong> ${metric} events this month.</p>
       <p>Upgrade your plan to keep automating without interruption.</p>`,
      { label: 'View plans', url: `${env.CLIENT_URL}/pricing` },
    ),
  });
};
