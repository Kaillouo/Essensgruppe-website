# GitHub Repository Configuration

**Last Updated:** 2026-02-21

---

## Repository Details

- **Owner:** kaillouo
- **Repo Name:** `Essensgruppe-website`
- **Full URL:** `https://github.com/Kaillouo/Essensgruppe-website`
- **Remote Name:** `origin` (already configured locally)

---

## Git Branches

### Main Branch
- **Name:** `main`
- **Purpose:** Production-ready code, deployed to OCI server
- **Status:** Protected (pull requests recommended before merging)

### Development Branches
- **forumnEvents** — Feature branch for forum + events implementation
- Additional feature branches follow pattern: `featureName` (lowercase, camelCase)

---

## Pushing to GitHub

### Authentication
- **Method:** HTTPS with Personal Access Token (PAT)
- **Token Scope:** `repo` (full control of private repos)
- **Expiry:** Check GitHub settings — refresh yearly if needed

### How to Push

**For the current branch (forumnEvents):**
```bash
git push origin forumnEvents
```

**For main branch:**
```bash
git push origin main
```

**Push all branches at once:**
```bash
git push origin --all
```

### First-Time Setup (One-Time)
If git prompts for credentials during `git push`:
1. Username: `kaillouo`
2. Password: Paste your GitHub Personal Access Token (not your account password)

Git will cache credentials in `~/.git-credentials` on Linux/Mac or Windows Credential Manager. No need to re-enter for future pushes.

---

## Workflow Overview

```
Local Development (Windows PC)
    ↓ (commit code)
GitHub (kaillouo/Essensgruppe-website)
    ↓ (git pull on OCI)
OCI Production Server (PM2)
    ↓ (running live)
https://essensgruppe-website.kaillouo.com
```

### Typical Session Flow

1. **Start dev servers locally:**
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

2. **Make changes, test locally**

3. **Commit when feature is ready:**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```

4. **Push to GitHub:**
   ```bash
   git push origin branchName
   ```

5. **On OCI server, pull latest:**
   ```bash
   cd /home/ubuntu/web/EssensgruppeWeb
   git pull origin main  # or current branch
   npm run build
   pm2 restart all
   ```

---

## Common Git Commands

**Check status:**
```bash
git status
```

**View recent commits:**
```bash
git log --oneline -10
```

**Create new branch:**
```bash
git checkout -b featureName
```

**Switch branches:**
```bash
git checkout main
git checkout forumnEvents
```

**Merge to main (do on local first):**
```bash
git checkout main
git pull origin main
git merge featureName
git push origin main
```

---

## Deployment to OCI

### Quick Deploy Steps

1. **SSH into OCI server:**
   ```bash
   ssh ubuntu@<OCI-IP>
   cd /home/ubuntu/web/EssensgruppeWeb
   ```

2. **Pull latest code:**
   ```bash
   git pull origin main
   ```

3. **Rebuild and restart:**
   ```bash
   npm run build
   pm2 restart all
   ```

4. **Verify it's live:**
   Visit `https://essensgruppe-website.kaillouo.com` in browser

### View Server Logs

**Backend logs:**
```bash
pm2 logs backend
```

**Frontend logs:**
```bash
pm2 logs frontend
```

**All logs:**
```bash
pm2 logs
```

---

## GitHub Tips

- Use **meaningful commit messages:** `feat: add X`, `fix: resolve Y`, `refactor: improve Z`
- Create **branches for features:** One feature per branch, easier to review and revert
- **Don't commit** `.env` files, `node_modules/`, `dist/`, or upload/ directories (already in `.gitignore`)
- **Review changes before push:** `git diff` to see what's staged

---

## Future: Pull Requests & Code Review

When the codebase grows or you have collaborators:
1. Push feature branch to GitHub
2. Open Pull Request (PR) from feature → main
3. Add description of changes
4. Request review (if applicable)
5. Merge once approved
6. Delete feature branch

---

## Reference Files

- `/CLAUDE.md` — Project specification
- `/PROGRESS.md` — Implementation log
- `/NextSteps.md` — What to do next
- `/SETUP.md` — Local dev setup guide
- `/ocichanges.md` — OCI server change log
