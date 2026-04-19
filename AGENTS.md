# AziTracks — Agent Instructions

## Deployment

This app auto-deploys to production ([www.azitracks.com](https://www.azitracks.com)) on every push to `main` via Railway.

**After making any code changes, always commit and push:**

```bash
git add <changed files>
git commit -m "short description of what changed"
git push origin main
```

Never use `git add .` or `git add -A` — always stage specific files by name to avoid accidentally committing sensitive files or unrelated changes.
