# Deployment Setup Guide

## Required Accounts

| Account | URL | Notes |
|---------|-----|-------|
| **GitHub** | [github.com](https://github.com) | Repository hosting |
| **Hosting Provider** | *See blueprint.md* | Deployment target |
| **Database Provider** | *See blueprint.md* | Data storage |

---

## Step 1: Clone Repository

```bash
git clone {{REPO_URL}}
cd {{PROJECT_NAME}}
```

---

## Step 2: Install Dependencies

> Use the package manager specified in `blueprint.md`

```bash
# npm
npm install

# yarn
yarn install

# pnpm
pnpm install

# bun
bun install
```

---

## Step 3: Configure Environment

Create `.env` file from example:

```bash
cp .env.example .env
```

Required variables (see `blueprint.md` for full list):
```env
DATABASE_URL=your_database_url
# Add other variables from blueprint.md
```

---

## Step 4: Setup Database

> Commands depend on your ORM. Check `blueprint.md` for specifics.

```bash
# If using Prisma
{{PACKAGE_MANAGER}} run db:generate
{{PACKAGE_MANAGER}} run db:migrate
{{PACKAGE_MANAGER}} run db:seed  # Optional

# If using other ORMs, check blueprint.md
```

---

## Step 5: Development

```bash
{{PACKAGE_MANAGER}} run dev
```

---

## Step 6: Production Build

```bash
{{PACKAGE_MANAGER}} run build
```

---

## Step 7: Deploy

Deployment commands depend on your hosting provider.
See `blueprint.md` for specific instructions.

```bash
{{PACKAGE_MANAGER}} run deploy
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Missing env vars | Check `.env` file against `blueprint.md` |
| Build fails | Run lint command to check for errors |
| Database connection | Verify DATABASE_URL format |
| Dependencies error | Delete node_modules and reinstall |

---

**Last Updated**: {{DATE}}
