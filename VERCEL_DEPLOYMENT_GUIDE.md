# Vercel Deployment Guide for USAHUDhomes

This guide provides complete instructions for deploying the USAHUDhomes application to Vercel with Supabase backend.

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Supabase project (already configured at https://lpqjndfjbenolhneqzec.supabase.co)

## Architecture Overview

**Frontend:** React 19 + Vite + Tailwind CSS 4  
**Backend:** Supabase (PostgreSQL database, Authentication, Storage)  
**Hosting:** Vercel  
**Domain:** Custom domain support available

## Step 1: Prepare the Repository

The application is already configured for Vercel deployment with:
- `vercel.json` configuration file
- Build command: `vite build`
- Output directory: `dist`
- Node.js version: 18+

## Step 2: Environment Variables

You'll need to configure the following environment variables in Vercel:

### Required Supabase Variables

```bash
VITE_SUPABASE_URL=https://lpqjndfjbenolhneqzec.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Optional Configuration

```bash
VITE_APP_NAME=USAHUDhomes
VITE_APP_URL=https://your-domain.vercel.app
```

### Getting Your Supabase Keys

1. Go to https://supabase.com/dashboard/project/lpqjndfjbenolhneqzec
2. Navigate to Settings → API
3. Copy the `Project URL` (already set above)
4. Copy the `anon/public` key

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**
   - The repository is already connected to GitHub at `AIRealSolutions/usahudhomes-app`
   - Ensure all changes are committed and pushed

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select `AIRealSolutions/usahudhomes-app`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add each variable from Step 2
   - Make sure to add them for all environments (Production, Preview, Development)

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from the project directory
cd /path/to/usahudhomes-app
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? usahudhomes
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

## Step 4: Configure Custom Domain (Optional)

1. In Vercel Dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `usahudhomes.com`)
4. Follow DNS configuration instructions
5. Vercel will automatically provision SSL certificate

### DNS Configuration Example

For domain `usahudhomes.com`:

**A Record:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## Step 5: Update Supabase Redirect URLs

After deployment, update Supabase authentication redirect URLs:

1. Go to https://supabase.com/dashboard/project/lpqjndfjbenolhneqzec
2. Navigate to Authentication → URL Configuration
3. Add your Vercel URLs to "Redirect URLs":
   - `https://your-project.vercel.app/**`
   - `https://usahudhomes.com/**` (if using custom domain)

## Step 6: Configure Supabase Storage (If Using Images)

The application uses Supabase Storage for property images and agent profiles.

### Storage Buckets Required

1. **property-images** (public)
   - For HUD property photos
   - Public access enabled

2. **agent-profiles** (public)
   - For broker profile images
   - Public access enabled

### Create Buckets

```sql
-- Run in Supabase SQL Editor
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true);

insert into storage.buckets (id, name, public)
values ('agent-profiles', 'agent-profiles', true);
```

### Set Storage Policies

```sql
-- Allow public read access
create policy "Public read access"
on storage.objects for select
using (bucket_id = 'property-images');

create policy "Public read access"
on storage.objects for select
using (bucket_id = 'agent-profiles');

-- Allow authenticated users to upload
create policy "Authenticated users can upload"
on storage.objects for insert
with check (bucket_id = 'property-images' AND auth.role() = 'authenticated');

create policy "Authenticated users can upload"
on storage.objects for insert
with check (bucket_id = 'agent-profiles' AND auth.role() = 'authenticated');
```

## Step 7: Database Setup

The database schema is already configured in your Supabase project. If you need to reset or update:

1. Go to Supabase SQL Editor
2. Run the migration file: `database/schema.sql`
3. Verify tables are created:
   - properties
   - customers
   - agents
   - consultations
   - customer_events
   - agent_applications
   - activities
   - referral_agreements

## Step 8: Test the Deployment

### Public Pages
- Homepage: `https://your-domain.vercel.app/`
- Property Search: `https://your-domain.vercel.app/properties`
- Property Detail: `https://your-domain.vercel.app/property/[case-number]`
- Agent Application: `https://your-domain.vercel.app/agent-registration`

### Admin Dashboard
- Login: `https://your-domain.vercel.app/login`
- Admin Dashboard: `https://your-domain.vercel.app/admin`

### Test Checklist
- [ ] Homepage loads correctly
- [ ] Property search works
- [ ] Property details display
- [ ] Inquiry form submits
- [ ] Agent application form works
- [ ] Admin login functions
- [ ] Admin dashboard accessible
- [ ] HUD import feature works
- [ ] Images load from Supabase Storage

## Step 9: Set Up Continuous Deployment

Vercel automatically deploys when you push to GitHub:

- **Production:** Pushes to `main` branch
- **Preview:** Pushes to other branches or pull requests

### Deployment Workflow

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically:
# 1. Detects the push
# 2. Builds the project
# 3. Deploys to production
# 4. Sends deployment notification
```

## Step 10: Configure Email Notifications (Optional)

The application uses Resend for email notifications. To enable:

1. Sign up at https://resend.com
2. Get your API key
3. Add to Vercel environment variables:
   ```bash
   VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

## Monitoring and Analytics

### Vercel Analytics

1. In Vercel Dashboard, go to your project
2. Click "Analytics" tab
3. Enable Web Analytics (free tier available)
4. View real-time traffic and performance metrics

### Supabase Monitoring

1. Go to Supabase Dashboard
2. View database usage, API requests, and storage
3. Set up alerts for quota limits

## Troubleshooting

### Build Fails

**Issue:** Build fails with dependency errors  
**Solution:** Ensure `pnpm` is used as package manager
```bash
# In Vercel settings, set:
Install Command: pnpm install
```

**Issue:** Environment variables not found  
**Solution:** Verify all `VITE_*` variables are set in Vercel

### Runtime Errors

**Issue:** Supabase connection fails  
**Solution:** Check environment variables are correct and Supabase project is active

**Issue:** Images don't load  
**Solution:** Verify storage buckets exist and have public access policies

### Authentication Issues

**Issue:** Login redirects fail  
**Solution:** Update Supabase redirect URLs to include your Vercel domain

## Performance Optimization

### Recommended Settings

1. **Enable Edge Network**
   - Vercel automatically uses global CDN
   - No configuration needed

2. **Image Optimization**
   - Use Supabase Image Transformation
   - Add `?width=800&height=600` to image URLs

3. **Caching**
   - Vercel automatically caches static assets
   - Configure cache headers in `vercel.json` if needed

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files to Git
   - Use Vercel's environment variable system
   - Rotate Supabase keys periodically

2. **Row Level Security**
   - Already configured in Supabase
   - Review policies regularly

3. **HTTPS**
   - Vercel automatically provides SSL
   - Enforce HTTPS redirects (enabled by default)

## Cost Estimation

### Vercel (Free Tier)
- 100 GB bandwidth/month
- Unlimited deployments
- Custom domains
- Automatic SSL

### Supabase (Free Tier)
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 2 GB bandwidth

### Upgrade Triggers
- **Vercel Pro ($20/mo):** More bandwidth, team collaboration
- **Supabase Pro ($25/mo):** More storage, daily backups

## Support Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **React Documentation:** https://react.dev
- **Vite Documentation:** https://vitejs.dev

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Configure custom domain
3. ✅ Test all features
4. ✅ Set up monitoring
5. ✅ Configure email notifications
6. ✅ Import initial property data
7. ✅ Create admin user account
8. ✅ Launch to production

## Maintenance

### Regular Tasks

- **Weekly:** Review new leads and assign to brokers
- **Daily:** Monitor HUD property updates
- **Monthly:** Review analytics and performance
- **Quarterly:** Update dependencies and security patches

### Backup Strategy

- Supabase automatically backs up database (Pro plan)
- Export critical data monthly
- Keep local copy of configuration files

---

**Deployment Date:** January 13, 2026  
**Version:** 1.0  
**Status:** Production Ready

For questions or support, contact: info@usahudhomes.com
