# Deploying Estuary to Render

This guide explains how to deploy the Estuary fullstack application to Render using the Blueprint (render.yaml) file.

## Prerequisites

1. A [Render account](https://render.com/)
2. Your code pushed to a GitHub or GitLab repository
3. Environment variables ready (see below)

## Quick Deploy

1. Push your code to GitHub/GitLab including the `render.yaml` file
2. In Render Dashboard, click **New > Blueprint**
3. Connect your repository
4. Render will detect the `render.yaml` file
5. Fill in the required environment variables
6. Click **Apply** to deploy

## Environment Variables to Configure

During deployment, you'll need to provide values for these sensitive variables:

### Backend Variables
- `DJANGO_SECRET_KEY` - Will be auto-generated if not provided
- `AWS_ACCESS_KEY_ID` - For S3 storage (optional)
- `AWS_SECRET_ACCESS_KEY` - For S3 storage (optional)
- `AWS_STORAGE_BUCKET_NAME` - Your S3 bucket name (optional)
- `STRIPE_PUBLIC_KEY` - Your Stripe publishable key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret
- `EMAIL_HOST` - SMTP server (e.g., smtp.gmail.com)
- `EMAIL_HOST_USER` - Email username
- `EMAIL_HOST_PASSWORD` - Email password

### Frontend Variables
- `NEXTAUTH_SECRET` - Will be auto-generated if not provided

## Post-Deployment Steps

### 1. Run Database Migrations
After deployment, run migrations in the Render shell:
```bash
python manage.py migrate
```

### 2. Create Superuser
Create an admin user:
```bash
python manage.py createsuperuser
```

### 3. Load Initial Data (Optional)
If you have fixtures:
```bash
python manage.py loaddata initial_data.json
```

## Service Architecture

The deployment creates:
- **Frontend**: Next.js app on port 3001
- **Backend**: Django + FastAPI on port 8000
- **Database**: PostgreSQL 16
- **Cache**: Redis for sessions and WebSocket support

## Customization

### Scaling
Change the `plan` field in `render.yaml`:
- `starter` - For development/testing
- `standard` - For production workloads

### Regions
Update the `region` field to deploy closer to your users:
- `oregon` (US West)
- `virginia` (US East)
- `frankfurt` (EU)
- `singapore` (Asia)

### Custom Domains
After deployment, add custom domains in the Render dashboard for each service.

## Monitoring

1. View logs in Render Dashboard
2. Set up alerts for service health
3. Monitor metrics (CPU, Memory, Response times)

## Troubleshooting

### Frontend Issues
- Check build logs for Node/pnpm errors
- Ensure all environment variables are set
- Verify API_URL points to backend service

### Backend Issues
- Check Python version compatibility
- Ensure DATABASE_URL is properly connected
- Verify Redis connection for WebSockets

### Database Issues
- Check connection string format
- Ensure IP allowlist includes services
- Monitor storage usage

## Cost Estimation

With starter plans:
- Frontend: ~$7/month
- Backend: ~$7/month
- Database: ~$7/month
- Redis: Free (25MB)
- **Total**: ~$21/month

For production (standard plans):
- Frontend: ~$25/month
- Backend: ~$25/month
- Database: ~$25/month
- Redis: ~$10/month
- **Total**: ~$85/month

## Updates

To update your deployment:
1. Push changes to your repository
2. Render automatically rebuilds and deploys
3. Monitor the deploy in Render Dashboard

## Rollbacks

If needed, rollback to a previous deploy:
1. Go to service in Render Dashboard
2. Click "Deploys" tab
3. Find previous successful deploy
4. Click "Rollback to this deploy"