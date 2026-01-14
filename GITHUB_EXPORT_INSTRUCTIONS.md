# GitHub Export Instructions

This document explains how to export the USAHUDhomes application to GitHub and manage the repository.

## Current Status

The repository is already connected to GitHub:
- **Repository:** `AIRealSolutions/usahudhomes-app`
- **Branch:** `main`
- **Remote:** `origin`

## Verify GitHub Connection

```bash
cd /home/ubuntu/usahudhomes-app
git remote -v
```

Expected output:
```
origin  https://github.com/AIRealSolutions/usahudhomes-app.git (fetch)
origin  https://github.com/AIRealSolutions/usahudhomes-app.git (push)
```

## Push Latest Changes to GitHub

### Step 1: Check Current Status

```bash
git status
```

### Step 2: Stage All Changes

```bash
git add .
```

### Step 3: Commit Changes

```bash
git commit -m "Complete USAHUDhomes platform with all features

- Database schema with merged consultations/leads
- Complete admin dashboard
- Broker dashboard with lead management
- HUD property import system
- Property search and listings
- Agent application system
- Communication event logging
- Vercel deployment configuration"
```

### Step 4: Push to GitHub

```bash
git push origin main
```

## Repository Structure

```
usahudhomes-app/
├── src/                          # React application source
│   ├── components/              # React components
│   │   ├── admin/              # Admin dashboard components
│   │   ├── agent/              # Agent/broker components
│   │   └── ...                 # Other components
│   ├── App.jsx                 # Main application component
│   └── main.jsx                # Application entry point
├── database/                    # Database schema and migrations
│   └── schema.sql              # Complete database schema
├── public/                      # Static assets
├── dist/                        # Build output (not in Git)
├── node_modules/               # Dependencies (not in Git)
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── vercel.json                 # Vercel deployment config
├── README.md                   # Project documentation
├── VERCEL_DEPLOYMENT_GUIDE.md  # Deployment instructions
├── HUD_IMPORT_DOCUMENTATION.md # HUD import guide
├── HUD_SYNC_DOCUMENTATION.md   # HUD sync guide
└── ... (other documentation)
```

## Files Excluded from Git (.gitignore)

The following files are automatically excluded:

```
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
__pycache__/
*.pyc
```

## Create a New Repository (If Needed)

If you want to create a fresh repository:

### Option 1: Via GitHub Web Interface

1. Go to https://github.com/AIRealSolutions
2. Click "New repository"
3. Name: `usahudhomes-platform`
4. Description: "HUD Home Marketplace Platform"
5. Visibility: Private (recommended) or Public
6. Do NOT initialize with README (we have one)
7. Click "Create repository"

### Option 2: Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# (Already available in the sandbox)

# Create new repository
gh repo create AIRealSolutions/usahudhomes-platform \
  --private \
  --description "HUD Home Marketplace Platform" \
  --source=. \
  --remote=origin \
  --push
```

## Connect to New Repository

If you created a new repository:

```bash
# Remove old remote (if exists)
git remote remove origin

# Add new remote
git remote add origin https://github.com/AIRealSolutions/usahudhomes-platform.git

# Push to new repository
git branch -M main
git push -u origin main
```

## Repository Settings

### Recommended Settings

1. **Branch Protection**
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Enable "Require pull request reviews before merging"
   - Enable "Require status checks to pass before merging"

2. **Secrets**
   - Go to Settings → Secrets and variables → Actions
   - Add secrets for CI/CD (if needed):
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

3. **Collaborators**
   - Go to Settings → Collaborators
   - Add team members with appropriate permissions

## Continuous Integration (Optional)

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 10
        
    - name: Install dependencies
      run: pnpm install
      
    - name: Build
      run: pnpm run build
      
    - name: Lint
      run: pnpm run lint
```

## Branching Strategy

### Recommended Workflow

```
main (production)
  ├── develop (staging)
  │   ├── feature/property-search
  │   ├── feature/broker-dashboard
  │   └── bugfix/login-issue
```

### Creating Feature Branches

```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/new-feature

# Create pull request on GitHub
# Merge after review
```

## Tagging Releases

### Create Version Tags

```bash
# Tag current version
git tag -a v1.0.0 -m "Version 1.0.0 - Initial release"

# Push tags to GitHub
git push origin --tags
```

### Semantic Versioning

- **Major (v2.0.0):** Breaking changes
- **Minor (v1.1.0):** New features, backward compatible
- **Patch (v1.0.1):** Bug fixes

## Clone Repository

To clone the repository on a new machine:

```bash
# Clone via HTTPS
git clone https://github.com/AIRealSolutions/usahudhomes-app.git

# Or clone via SSH (if configured)
git clone git@github.com:AIRealSolutions/usahudhomes-app.git

# Navigate to directory
cd usahudhomes-app

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

## Common Git Commands

### Check Status
```bash
git status
```

### View Commit History
```bash
git log --oneline
```

### Pull Latest Changes
```bash
git pull origin main
```

### Discard Local Changes
```bash
git checkout -- filename
# Or discard all changes
git reset --hard HEAD
```

### View Differences
```bash
git diff
```

## Backup Strategy

### Local Backup

```bash
# Create backup
cd /home/ubuntu
tar -czf usahudhomes-backup-$(date +%Y%m%d).tar.gz usahudhomes-app/

# Exclude node_modules and dist
tar -czf usahudhomes-backup-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  usahudhomes-app/
```

### GitHub as Backup

GitHub serves as your primary backup:
- All code is version controlled
- Complete history preserved
- Can restore any previous version
- Multiple contributors have copies

## Repository Maintenance

### Regular Tasks

**Weekly:**
- Review and merge pull requests
- Update dependencies: `pnpm update`
- Check for security vulnerabilities: `pnpm audit`

**Monthly:**
- Review and close stale issues
- Update documentation
- Tag new releases

**Quarterly:**
- Major dependency updates
- Security audit
- Performance review

## Troubleshooting

### Authentication Issues

**Problem:** Git push asks for username/password repeatedly

**Solution 1:** Use GitHub Personal Access Token
```bash
# Generate token at: https://github.com/settings/tokens
# Use token as password when prompted
```

**Solution 2:** Use SSH keys
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub: https://github.com/settings/keys
# Change remote to SSH
git remote set-url origin git@github.com:AIRealSolutions/usahudhomes-app.git
```

### Large Files

**Problem:** Git refuses to push large files

**Solution:** Use Git LFS for large files
```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.mp4"
git lfs track "*.zip"

# Add .gitattributes
git add .gitattributes
git commit -m "Configure Git LFS"
```

### Merge Conflicts

**Problem:** Merge conflicts when pulling

**Solution:** Resolve conflicts manually
```bash
# Pull latest changes
git pull origin main

# Edit conflicted files
# Look for <<<<<<< HEAD markers

# After resolving
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

## Security Best Practices

1. **Never commit sensitive data**
   - API keys
   - Passwords
   - Database credentials
   - Use `.env` files (excluded by `.gitignore`)

2. **Review before committing**
   ```bash
   git diff --staged
   ```

3. **Use branch protection**
   - Require reviews for main branch
   - Enable status checks

4. **Regular security audits**
   ```bash
   pnpm audit
   pnpm audit fix
   ```

## Next Steps

1. ✅ Verify GitHub connection
2. ✅ Push latest changes
3. ✅ Configure repository settings
4. ✅ Add collaborators
5. ✅ Set up branch protection
6. ✅ Create first release tag
7. ✅ Connect to Vercel for deployment

---

**Repository:** https://github.com/AIRealSolutions/usahudhomes-app  
**Documentation:** See VERCEL_DEPLOYMENT_GUIDE.md for deployment  
**Contact:** info@usahudhomes.com
