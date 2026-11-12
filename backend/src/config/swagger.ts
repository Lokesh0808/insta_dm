import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Instaflow API',
      version: '1.0.0',
      description:
        'REST API for the Instaflow Instagram Automation SaaS. Authenticate with a Bearer access token obtained from `POST /api/auth/login`.',
      license: { name: 'MIT' },
    },
    servers: [
      { url: env.API_URL, description: 'API server' },
      { url: 'http://localhost:4000/api', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication', description: 'Register, login, refresh and password reset' },
      { name: 'Instagram', description: 'Connect and manage Instagram Professional accounts' },
      { name: 'Automations', description: 'Keyword, comment-to-DM and workflow automations' },
      { name: 'Leads', description: 'Lead capture, search, tagging and CSV export' },
      { name: 'Conversations', description: 'Instagram DM inbox' },
      { name: 'Analytics', description: 'Dashboard performance metrics' },
      { name: 'Billing', description: 'Razorpay subscriptions, invoices and usage' },
      { name: 'Link-in-bio', description: 'Link-in-bio page builder and analytics' },
      { name: 'Admin', description: 'Platform administration' },
      { name: 'Webhooks', description: 'Meta Instagram and Razorpay webhooks' },
    ],
  },
  apis: [],
});

/**
 * Swagger documents are defined inline next to the routes they describe.
 * This helper attaches them to the generated spec at runtime.
 */
export const registerSwaggerDocs = (target: swaggerJsdoc.OAS3Definition): void => {
  const docs = [
    {
      path: '/api/auth/register',
      method: 'POST',
      tag: 'Authentication',
      summary: 'Register a new user and workspace',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string', example: 'Ada Lovelace' },
                email: { type: 'string', format: 'email' },
                password: { type: 'string', format: 'password', minLength: 8 },
                workspaceName: { type: 'string', example: "Ada's workspace" },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Account created' } },
    },
    {
      path: '/api/auth/login',
      method: 'POST',
      tag: 'Authentication',
      summary: 'Sign in with email and password',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', format: 'password' },
              },
            },
          },
        },
      },
      responses: { '200': { description: 'Signed in' } },
    },
    {
      path: '/api/auth/refresh',
      method: 'POST',
      tag: 'Authentication',
      summary: 'Refresh the access token',
      responses: { '200': { description: 'New tokens issued' } },
    },
    {
      path: '/api/auth/logout',
      method: 'POST',
      tag: 'Authentication',
      summary: 'Revoke the current session',
      responses: { '200': { description: 'Signed out' } },
    },
    {
      path: '/api/auth/forgot-password',
      method: 'POST',
      tag: 'Authentication',
      summary: 'Send a password reset email',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', format: 'email' } },
            },
          },
        },
      },
      responses: { '200': { description: 'Email sent (if the account exists)' } },
    },
    {
      path: '/api/instagram/connect',
      method: 'GET',
      tag: 'Instagram',
      summary: 'Get the Meta OAuth URL used to connect an Instagram account',
      responses: { '200': { description: 'OAuth dialog URL' } },
    },
    {
      path: '/api/instagram/callback',
      method: 'GET',
      tag: 'Instagram',
      summary: 'Meta OAuth redirect target (called by Meta)',
      responses: { '302': { description: 'Redirects back to the dashboard' } },
    },
    {
      path: '/api/instagram/accounts',
      method: 'GET',
      tag: 'Instagram',
      summary: 'List connected Instagram accounts',
      responses: { '200': { description: 'Connected accounts' } },
    },
    {
      path: '/api/instagram/accounts/{id}',
      method: 'DELETE',
      tag: 'Instagram',
      summary: 'Disconnect an Instagram account',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Account disconnected' } },
    },
    {
      path: '/api/automations',
      method: 'GET',
      tag: 'Automations',
      summary: 'List automations',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
      ],
      responses: { '200': { description: 'Paginated automations' } },
    },
    {
      path: '/api/automations',
      method: 'POST',
      tag: 'Automations',
      summary: 'Create an automation',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'type', 'instagramAccountId'],
              properties: {
                name: { type: 'string', example: 'Pricing keyword reply' },
                type: { type: 'string', enum: ['KEYWORD_DM', 'COMMENT_DM', 'STORY_REPLY', 'WELCOME_DM', 'FOLLOW_DM', 'WORKFLOW'] },
                instagramAccountId: { type: 'string' },
                message: { type: 'string', example: 'Thanks for your interest! Here is our pricing link.' },
                triggers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['KEYWORD', 'COMMENT', 'STORY_REPLY'] },
                      keywords: { type: 'array', items: { type: 'string' }, example: ['PRICE'] },
                      matchType: { type: 'string', enum: ['EXACT', 'PARTIAL', 'STARTS_WITH', 'CONTAINS', 'REGEX'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: { '201': { description: 'Automation created' } },
    },
    {
      path: '/api/automations/{id}',
      method: 'GET',
      tag: 'Automations',
      summary: 'Get one automation',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Automation' } },
    },
    {
      path: '/api/automations/{id}',
      method: 'PUT',
      tag: 'Automations',
      summary: 'Update an automation',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Automation updated' } },
    },
    {
      path: '/api/automations/{id}',
      method: 'DELETE',
      tag: 'Automations',
      summary: 'Delete an automation',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Automation deleted' } },
    },
    {
      path: '/api/automations/{id}/toggle',
      method: 'PATCH',
      tag: 'Automations',
      summary: 'Activate or deactivate an automation',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { isActive: { type: 'boolean' } } },
          },
        },
      },
      responses: { '200': { description: 'Automation toggled' } },
    },
    {
      path: '/api/leads',
      method: 'GET',
      tag: 'Leads',
      summary: 'Search and filter leads',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'source', in: 'query', schema: { type: 'string' } },
        { name: 'tag', in: 'query', schema: { type: 'string' } },
      ],
      responses: { '200': { description: 'Paginated leads' } },
    },
    {
      path: '/api/leads',
      method: 'POST',
      tag: 'Leads',
      summary: 'Create a lead manually',
      responses: { '201': { description: 'Lead created' } },
    },
    {
      path: '/api/leads/{id}',
      method: 'GET',
      tag: 'Leads',
      summary: 'Get one lead',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Lead' } },
    },
    {
      path: '/api/leads/{id}',
      method: 'DELETE',
      tag: 'Leads',
      summary: 'Delete a lead',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { '200': { description: 'Lead deleted' } },
    },
    {
      path: '/api/leads/export',
      method: 'GET',
      tag: 'Leads',
      summary: 'Export leads as CSV (Growth plan and above)',
      responses: { '200': { description: 'CSV file' } },
    },
    {
      path: '/api/analytics/overview',
      method: 'GET',
      tag: 'Analytics',
      summary: 'Dashboard overview metrics',
      parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', enum: [7, 30, 90, 365] } }],
      responses: { '200': { description: 'Overview metrics' } },
    },
    {
      path: '/api/analytics/dms',
      method: 'GET',
      tag: 'Analytics',
      summary: 'DM performance analytics',
      responses: { '200': { description: 'DM analytics' } },
    },
    {
      path: '/api/analytics/leads',
      method: 'GET',
      tag: 'Analytics',
      summary: 'Lead conversion analytics',
      responses: { '200': { description: 'Lead analytics' } },
    },
    {
      path: '/api/webhooks/instagram',
      method: 'GET',
      tag: 'Webhooks',
      summary: 'Meta webhook verification handshake',
      responses: { '200': { description: 'hub.challenge echoed back' } },
    },
    {
      path: '/api/webhooks/instagram',
      method: 'POST',
      tag: 'Webhooks',
      summary: 'Meta Instagram event delivery',
      responses: { '200': { description: 'Event accepted' } },
    },
    {
      path: '/api/billing/create-order',
      method: 'POST',
      tag: 'Billing',
      summary: 'Create a Razorpay order for a plan',
      responses: { '200': { description: 'Order details' } },
    },
    {
      path: '/api/billing/verify-payment',
      method: 'POST',
      tag: 'Billing',
      summary: 'Verify a payment server-side and activate the subscription',
      responses: { '200': { description: 'Subscription activated' } },
    },
    {
      path: '/api/billing/webhook',
      method: 'POST',
      tag: 'Billing',
      summary: 'Razorpay subscription webhook',
      responses: { '200': { description: 'Webhook processed' } },
    },
    {
      path: '/api/billing/subscription',
      method: 'GET',
      tag: 'Billing',
      summary: 'Current subscription and usage',
      responses: { '200': { description: 'Subscription details' } },
    },
    {
      path: '/api/admin/overview',
      method: 'GET',
      tag: 'Admin',
      summary: 'Platform metrics (MRR, users, subscriptions)',
      responses: { '200': { description: 'Admin metrics' } },
    },
  ];

  const spec = target as any;
  spec.paths = spec.paths ?? {};

  for (const doc of docs) {
    const { path: p, method, ...rest } = doc as any;
    const normalised = p.replace(/\{(\w+)\}/g, '{$1}');
    if (!spec.paths[normalised]) spec.paths[normalised] = {};
    spec.paths[normalised][method] = {
      tags: [rest.tag],
      summary: rest.summary,
      ...(rest.parameters ? { parameters: rest.parameters } : {}),
      ...(rest.requestBody ? { requestBody: rest.requestBody } : {}),
      responses: rest.responses,
      security: p.startsWith('/api/webhooks') || p.startsWith('/api/billing/webhook') ? [] : undefined,
    };
  }
};
