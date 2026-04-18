# Contributing to HuskyPark Predictor

Thank you for contributing! Please follow this guide to keep the project consistent and the commit history clean.

---

## Git Flow

We use a simplified Git Flow:

```
main      → production (protected, PR-only)
develop   → integration branch (protected, PR-only)
feature/* → new features (branch from develop)
bugfix/*  → non-urgent bug fixes (branch from develop)
hotfix/*  → urgent production patches (branch from main)
```

### Start a feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Open a pull request

1. Push your branch: `git push origin feature/your-feature-name`
2. Open a PR against `develop` on GitHub.
3. Assign at least one other team member as reviewer.
4. All CI checks must pass before merging.
5. Squash-merge or rebase-merge — no merge commits on `develop`.

---

## Commit Message Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
```

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that isn't a feature or bug fix |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `chore` | Build, CI, or tooling changes |
| `style` | Formatting, whitespace |

**Examples:**
```
feat(dashboard): add 60-second prediction polling
fix(auth): prevent JWT token stored in localStorage
docs(readme): add Azure deployment section
chore(ci): add ESLint step to PR workflow
```

---

## Code Style

- **Python**: follow PEP 8; use `ruff` for linting.
- **TypeScript/React**: ESLint + Prettier; strict mode enabled.
- All new API routes require Pydantic schema validation.
- No raw SQL string formatting — use asyncpg parameterized queries.

---

## Running Tests Locally

```bash
# Backend
cd backend
source .venv/bin/activate
pytest --tb=short

# Frontend
cd frontend
npm run lint
```

---

## Reporting Issues

Open a GitHub Issue with the `bug` or `enhancement` label. Include steps to reproduce if reporting a bug.
