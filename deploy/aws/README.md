# Instaflow — AWS deployment guide

This directory contains everything needed to run Instaflow on AWS.

```
deploy/aws/
├── cloudformation.yaml   # VPC, subnets, NAT, EC2, S3, IAM, Route 53, ACM
├── user-data.sh          # alternative bootstrap script (baked into an AMI)
└── iam-policy.json       # least-privilege policy for the instance role
```

---

## 1. Provision the infrastructure

```bash
aws cloudformation deploy \
  --template-file deploy/aws/cloudformation.yaml \
  --stack-name instaflow \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      DomainName=instaflow.com \
      InstanceType=t3.medium \
      KeyName=instaflow-key \
      GitRepo=https://github.com/your-org/instaflow.git
```

Outputs: `PublicIp`, `ApiDnsName`, `AssetsBucketName`, `BackupBucketName`.

> **MongoDB** — use MongoDB Atlas (M10+). Add the EC2 private IP to the Atlas
> IP access list. Set `MONGODB_URI` accordingly.
>
> **Redis** — use ElastiCache Redis in the private subnet. Set `REDIS_HOST` to
> the primary endpoint.

---

## 2. Store the production environment in SSM

Secrets must never live in the repository or in a shell history.

```bash
aws ssm put-parameter \
  --name /instaflow/prod/env \
  --type SecureString \
  --overwrite \
  --value file://.env
```

The EC2 user-data downloads this parameter at boot and writes it to
`/opt/instaflow/.env` (mode `600`).

At minimum set these before uploading:

```dotenv
NODE_ENV=production
MONGODB_URI=mongodb+srv://...@cluster.mongodb.net/instaflow
REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
REDIS_PORT=6379
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
ENCRYPTION_KEY=<openssl rand -hex 32>
CLIENT_URL=https://instaflow.com
API_URL=https://instaflow.com/api
APP_BASE_URL=https://instaflow.com
CORS_ORIGINS=https://instaflow.com
COOKIE_SECURE=true
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://instaflow.com/api/instagram/callback
META_WEBHOOK_VERIFY_TOKEN=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
STORAGE_DRIVER=s3
AWS_S3_BUCKET=instaflow-assets-<account-id>
```

---

## 3. DNS and TLS

The template creates a hosted zone and a wildcard certificate. Create the
records in Route 53:

| Type | Name | Value |
| --- | --- | --- |
| A | `instaflow.com` | EC2 public IP |
| A | `api.instaflow.com` | EC2 public IP |

Validate the wildcard certificate in ACM, then on the host run:

```bash
sudo ./scripts/setup-https.sh instaflow.com admin@instaflow.com
```

This issues a Let's Encrypt certificate through the ACME webroot challenge
(which the Nginx container already serves) and installs the renewal cron job.

---

## 4. Deploy and operate

```bash
ssh ubuntu@<EC2-IP>
cd /opt/instaflow

./scripts/deploy.sh          # build, start, health-check, install backups
docker compose ps
docker compose logs -f
```

### Scaling

- **Vertical** — change `InstanceType` and redeploy the stack.
- **Horizontal** — put an Application Load Balancer in front of the EC2
  instance, run 2+ instances across availability zones, and move the session
  store to Redis so refresh tokens work across instances (they already do —
  sessions live in MongoDB).
- **Database** — MongoDB Atlas M30+ with a replica set for production.

### Monitoring

- Health probe: `GET /api/health` (returns `503` when MongoDB is unreachable).
- Install the CloudWatch agent on the host; the backend already emits
  structured JSON logs via Pino.
- Alert on: `automationEvents` growth, queue depth, 5xx rate, and
  `MONGO_URL` connection failures.

### Backups

`scripts/backup.sh` runs nightly at 03:00, writes a gzipped `mongodump` to
`/var/backups/instaflow` and uploads it to S3 (lifecycle → Glacier after 30
days). Restore with `scripts/restore.sh <archive>`.

### Cost optimisation

- Right-size the EC2 instance after a week of CloudWatch data.
- Schedule the stack to stop overnight if the automations allow it.
- Use Graviton (`t4g.medium`) for ~20% lower cost.
- Atlas Flex / ElastiCache node types scale independently of the app tier.
