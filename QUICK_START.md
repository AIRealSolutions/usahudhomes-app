# USAHUDhomes - Quick Start Guide

## ✅ Application Status

**Status:** Fixed and Ready to Deploy  
**Issue Resolved:** Blank screen fixed (missing React imports and CSS configuration)  
**Last Updated:** January 13, 2026

---

## 🚀 Deploy to Vercel (5 Minutes)

### Step 1: Import Repository

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select `AIRealSolutions/usahudhomes-app`
4. Click "Import"

### Step 2: Configure Build Settings

**Framework Preset:** Vite  
**Root Directory:** `./`  
**Build Command:** `pnpm run build`  
**Output Directory:** `dist`  
**Install Command:** `pnpm install`  
**Node.js Version:** 18.x

### Step 3: Add Environment Variables

Click "Environment Variables" and add these **REQUIRED** variables:

```bash
VITE_SUPABASE_URL=https://lpqjndfjbenolhneqzec.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWpuZGZqYmVub2xobmVxemVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MzY1NzAsImV4cCI6MjA1MjMxMjU3MH0.ORqXGLJTLvOJJCqBDMzqIjqcPqbEOXqgZcPpGhEVCJE
```

**Important:** Add these to all environments (Production, Preview, Development)

### Step 4: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Your app will be live at `https://your-project.vercel.app`

### Step 5: Update Supabase Redirect URLs

1. Go to https://supabase.com/dashboard/project/lpqjndfjbenolhneqzec
2. Navigate to: Authentication → URL Configuration
3. Add to "Redirect URLs":
   ```
   https://your-project.vercel.app/**
   ```

---

## 🔧 Local Development

### Prerequisites

- Node.js 18+
- pnpm package manager

### Setup

```bash
# Clone repository
git clone https://github.com/AIRealSolutions/usahudhomes-app.git
cd usahudhomes-app

# Install dependencies
pnpm install

# Create .env file
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://lpqjndfjbenolhneqzec.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWpuZGZqYmVub2xobmVxemVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MzY1NzAsImV4cCI6MjA1MjMxMjU3MH0.ORqXGLJTLvOJJCqBDMzqIjqcPqbEOXqgZcPpGhEVCJE
EOF

# Start development server
pnpm run dev

# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
pnpm run build
pnpm run preview
```

---

## 🐛 Recent Fixes

### Blank Screen Issue - RESOLVED ✅

**Problem:** Application showed blank screen on load

**Root Causes:**
1. Missing `useState` import in App.jsx
2. Empty index.css file (no Tailwind configuration)
3. Missing environment variables

**Solutions Applied:**
1. ✅ Added React imports to App.jsx
2. ✅ Configured Tailwind CSS in index.css
3. ✅ Created .env file with Supabase credentials
4. ✅ Verified build completes successfully

**Status:** Application now loads correctly

---

## 📦 What's Included

### Complete Features

**Public Pages:**
- Homepage with search
- Property listings with filters
- Property detail pages
- Inquiry forms
- Agent application

**Broker Dashboard:**
- Assigned leads management
- Communication logging
- Customer profiles
- AI property matching

**Admin Dashboard:**
- Property CRUD operations
- HUD property import (3 methods)
- Customer management
- Lead assignment
- Agent management
- Analytics

### Database

**Supabase Project:** `lpqjndfjbenolhneqzec`

**Tables:**
- properties
- customers
- agents
- consultations (unified leads)
- customer_events
- agent_applications
- activities
- referral_agreements
- users

---

## 🎯 Post-Deployment Tasks

### Immediate (First Hour)

1. **Test the Application**
   - Visit your Vercel URL
   - Test property search
   - Submit a test inquiry
   - Verify admin login works

2. **Create Admin Account**
   - Go to Supabase Dashboard
   - Open SQL Editor
   - Run:
     ```sql
     INSERT INTO users (email, role, created_at)
     VALUES ('your-email@example.com', 'admin', NOW());
     ```

3. **Import Initial Properties**
   - Login to admin dashboard
   - Go to Properties → HUD Import
   - Paste property data or run Python scraper

### First Week

1. **Configure Custom Domain** (Optional)
   - Add domain in Vercel settings
   - Update DNS records
   - Update Supabase redirect URLs

2. **Set Up Email Notifications** (Optional)
   - Sign up for Resend account
   - Add `VITE_RESEND_API_KEY` to Vercel
   - Test email delivery

3. **Train Team**
   - Review admin dashboard features
   - Practice lead assignment
   - Test HUD import process

---

## 🔐 Security Notes

- ✅ HTTPS automatic with Vercel
- ✅ Environment variables secured
- ✅ Row Level Security in Supabase
- ✅ Role-based access control
- ✅ Input validation with Zod

---

## 📊 Technology Stack

**Frontend:**
- React 19
- Vite 6
- Tailwind CSS 4
- shadcn/ui components
- React Router

**Backend:**
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage

**Hosting:**
- Vercel (frontend)
- Supabase (backend)

---

## 💰 Cost

### Free Tier (Perfect for Launch)

**Vercel:**
- 100 GB bandwidth/month
- Unlimited deployments
- Custom domains + SSL
- **Cost:** $0/month

**Supabase:**
- 500 MB database
- 1 GB storage
- 50K monthly active users
- **Cost:** $0/month

**Total:** $0/month

### When to Upgrade

- **Vercel Pro ($20/mo):** >100 GB bandwidth
- **Supabase Pro ($25/mo):** >500 MB database or need daily backups

---

## 📚 Documentation

Complete documentation available in repository:

- `VERCEL_DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `HUD_IMPORT_DOCUMENTATION.md` - Property import guide
- `HUD_SYNC_DOCUMENTATION.md` - Automated scraping
- `GITHUB_EXPORT_INSTRUCTIONS.md` - Repository management

---

## 🆘 Troubleshooting

### Build Fails

**Issue:** Vite build errors  
**Solution:** Ensure environment variables are set in Vercel

### Blank Screen

**Issue:** App loads but shows blank page  
**Solution:** Check browser console for errors, verify Supabase credentials

### Database Connection Fails

**Issue:** "Failed to connect to database"  
**Solution:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

### Images Don't Load

**Issue:** Property images not displaying  
**Solution:** Check Supabase storage buckets exist and have public access

---

## 📞 Support

**Repository:** https://github.com/AIRealSolutions/usahudhomes-app  
**Supabase Dashboard:** https://supabase.com/dashboard/project/lpqjndfjbenolhneqzec

**Business Contact:**
- Lightkeeper Realty
- 910-363-6147
- info@usahudhomes.com

---

## ✅ Deployment Checklist

- [ ] Repository imported to Vercel
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] First deployment successful
- [ ] Supabase redirect URLs updated
- [ ] Application tested and working
- [ ] Admin account created
- [ ] Initial properties imported
- [ ] Team trained on features

---

**Status:** Ready for Production 🚀  
**Deployment Time:** ~15 minutes  
**Difficulty:** Easy (well-documented)

Follow the steps above and your HUD home marketplace will be live!
